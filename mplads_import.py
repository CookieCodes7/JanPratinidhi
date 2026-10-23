#!/usr/bin/env python3

"""
JanPratinidhi MPLADS/eSAKSHI -> PostgreSQL importer.

Expected files in the same folder:

    mplads_mp_summary.json
    mplads_works_recommended.json
    mplads_works_sanctioned.json
    mplads_works_completed.json

Run:

    $env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/janpratinidhi"
    python mplads_import.py

The importer is designed to be safely re-run.
"""

from __future__ import annotations

import ast
import hashlib
import json
import os
import re
import sys

from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

try:
    import psycopg2
    from psycopg2.extras import Json, execute_values
except ImportError:
    print("psycopg2 is not installed.")
    print("Run:")
    print("    pip install psycopg2-binary")
    sys.exit(1)


# ============================================================
# CONFIG
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

SUMMARY_FILE = BASE_DIR / "mplads_mp_summary.json"
RECOMMENDED_FILE = BASE_DIR / "mplads_works_recommended.json"
SANCTIONED_FILE = BASE_DIR / "mplads_works_sanctioned.json"
COMPLETED_FILE = BASE_DIR / "mplads_works_completed.json"

SOURCE_NAME = "MPLADS / eSAKSHI"
SOURCE_URL = "https://www.mplads.gov.in/"


# ============================================================
# BASIC HELPERS
# ============================================================

def clean(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    if text.lower() in {
        "null",
        "none",
        "n/a",
        "na",
        "-",
        "--",
    }:
        return None

    return text


def get_value(
    record: dict[str, Any],
    *keys: str,
) -> Any:

    if not isinstance(record, dict):
        return None

    lowered = {
        str(key).lower(): value
        for key, value in record.items()
    }

    for key in keys:

        if key in record:
            value = record[key]

            if value is not None and str(value).strip():
                return value

        value = lowered.get(key.lower())

        if value is not None and str(value).strip():
            return value

    return None


def load_json(path: Path) -> Any:

    if not path.exists():
        print(f"WARNING: {path.name} not found.")
        return None

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as file:
        return json.load(file)


def decode_json_string(value: Any) -> Any:

    if not isinstance(value, str):
        return value

    text = value.strip()

    if not text:
        return value

    try:
        return json.loads(text)

    except Exception:
        pass

    if text.startswith("[") or text.startswith("{"):

        try:
            return ast.literal_eval(text)

        except Exception:
            pass

    return value


# ============================================================
# RECORD EXTRACTION
# ============================================================

def extract_records(obj: Any) -> list[dict[str, Any]]:

    obj = decode_json_string(obj)

    # Direct list
    if isinstance(obj, list):

        result = []

        for item in obj:

            item = decode_json_string(item)

            if isinstance(item, dict):
                result.append(item)

            elif isinstance(item, list):
                result.extend(
                    extract_records(item)
                )

        return result

    # Dictionary
    if isinstance(obj, dict):

        keys = {
            str(key).upper()
            for key in obj.keys()
        }

        # This looks like an actual work record.
        markers = {
            "MP_NAME",
            "WORK_ID",
            "WORK_DESCRIPTION",
            "ACTIVITY_NAME",
            "WORK_RECOMMENDATION_DTL_ID",
        }

        if keys.intersection(markers):
            return [obj]

        result = []

        for value in obj.values():

            value = decode_json_string(value)

            if isinstance(value, (dict, list)):
                result.extend(
                    extract_records(value)
                )

        return result

    return []


# ============================================================
# NUMBER / DATE PARSING
# ============================================================

def parse_money(value: Any) -> Decimal | None:

    if value is None:
        return None

    text = str(value).strip()

    if not text:
        return None

    # Example:
    # "5.20 Crore"
    crore_match = re.search(
        r"([0-9][0-9,\s]*(?:\.[0-9]+)?)\s*crore",
        text,
        re.IGNORECASE,
    )

    if crore_match:

        number = (
            crore_match
            .group(1)
            .replace(",", "")
            .replace(" ", "")
        )

        try:
            return (
                Decimal(number)
                * Decimal("10000000")
            )

        except InvalidOperation:
            return None

    text = (
        text
        .replace("₹", "")
        .replace("Rs.", "")
        .replace("Rs", "")
        .replace(",", "")
    )

    text = re.sub(
        r"[^0-9.\-]",
        "",
        text,
    )

    if not text:
        return None

    try:
        return Decimal(text)

    except InvalidOperation:
        return None


def parse_int(value: Any) -> int | None:

    if value is None:
        return None

    try:
        return int(
            float(
                str(value)
                .replace(",", "")
                .strip()
            )
        )

    except (
        ValueError,
        TypeError,
    ):
        return None


def parse_date(value: Any):

    if value is None:
        return None

    text = (
        str(value)
        .strip()
        .strip("\"'")
    )

    formats = [

        "%d-%b-%Y",

        "%d-%B-%Y",

        "%d/%m/%Y",

        "%d-%m-%Y",

        "%Y-%m-%d",

        "%Y/%m/%d",

        "%b %d, %Y %I:%M:%S %p",

        "%B %d, %Y %I:%M:%S %p",

        "%b %d, %Y %H:%M:%S",

        "%B %d, %Y %H:%M:%S",

    ]

    for fmt in formats:

        try:
            return datetime.strptime(
                text,
                fmt,
            ).date()

        except ValueError:
            pass

    try:

        return datetime.fromisoformat(
            text.replace(
                "Z",
                "+00:00",
            )
        ).date()

    except ValueError:
        return None


# ============================================================
# SOURCE RECORD ID
# ============================================================

def make_source_record_id(
    record: dict[str, Any],
    status: str,
) -> str:

    # eSAKSHI normally provides one of these.
    candidates = [

        "WORK_ID",

        "WORK_RECOMMENDATION_DTL_ID",

        "WORK_RECOMMENDATION_DETAIL_ID",

    ]

    for key in candidates:

        value = clean(
            get_value(
                record,
                key,
            )
        )

        if value:
            return value

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # Some live eSAKSHI records don't contain WORK_ID.
    #
    # PostgreSQL requires source_record_id to be NOT NULL.
    #
    # Instead of inserting NULL, generate a deterministic
    # identifier from the actual source record.
    # --------------------------------------------------------

    identity_fields = [

        get_value(
            record,
            "MP_NAME",
        ),

        get_value(
            record,
            "STATE_NAME",
        ),

        get_value(
            record,
            "CONSTITUENCY",
        ),

        get_value(
            record,
            "CONSTITUENCY_ID",
        ),

        get_value(
            record,
            "ACTIVITY_NAME",
        ),

        get_value(
            record,
            "WORK_DESCRIPTION",
        ),

        get_value(
            record,
            "LETTER_NO",
        ),

        get_value(
            record,
            "RECOMMENDATION_DATE",
        ),

        get_value(
            record,
            "SANCTION_DATE",
        ),

        get_value(
            record,
            "ACTUAL_END_DATE",
        ),

        status,

    ]

    identity = "|".join(
        ""
        if value is None
        else str(value).strip()
        for value in identity_fields
    )

    digest = hashlib.sha256(
        identity.encode("utf-8")
    ).hexdigest()[:24]

    return f"generated-{digest}"


# ============================================================
# WORK NORMALIZATION
# ============================================================

def normalize_work(
    record: dict[str, Any],
    status: str,
) -> dict[str, Any]:

    house_number = parse_int(
        get_value(
            record,
            "HOUSE_OF_PARLIAMENT",
        )
    )

    if house_number == 1:
        house = "rajya_sabha"
    else:
        house = "lok_sabha"

    return {

        "source_record_id":
            make_source_record_id(
                record,
                status,
            ),

        "work_id":
            clean(
                get_value(
                    record,
                    "WORK_ID",
                )
            ),

        "mp_name":
            clean(
                get_value(
                    record,
                    "MP_NAME",
                )
            ),

        "house":
            house,

        "tenure":
            clean(
                get_value(
                    record,
                    "TENURE",
                )
            )
            or "18th Lok Sabha",

        "state":
            clean(
                get_value(
                    record,
                    "STATE_NAME",
                    "STATE",
                )
            ),

        "constituency":
            clean(
                get_value(
                    record,
                    "CONSTITUENCY",
                    "CONSTITUENCY_NAME",
                )
            ),

        "constituency_id":
            parse_int(
                get_value(
                    record,
                    "CONSTITUENCY_ID",
                )
            ),

        "district_authority":
            clean(
                get_value(
                    record,
                    "IDA_NAME",
                    "DISTRICT_AUTHORITY",
                )
            ),

        "work_category":
            clean(
                get_value(
                    record,
                    "WORK_CATEGORY",
                )
            ),

        "activity_name":
            clean(
                get_value(
                    record,
                    "ACTIVITY_NAME",
                )
            ),

        "work_description":
            clean(
                get_value(
                    record,
                    "WORK_DESCRIPTION",
                )
            ),

        "work_stage":
            clean(
                get_value(
                    record,
                    "WORK_STAGE",
                )
            ),

        "work_status":
            status,

        "recommendation_date":
            parse_date(
                get_value(
                    record,
                    "RECOMMENDATION_DATE",
                )
            ),

        "sanction_date":
            parse_date(
                get_value(
                    record,
                    "SANCTION_DATE",
                )
            ),

        "actual_end_date":
            parse_date(
                get_value(
                    record,
                    "ACTUAL_END_DATE",
                )
            ),

        "recommended_amount":
            parse_money(
                get_value(
                    record,
                    "RECOMMENDED_AMOUNT",
                )
            ),

        "sanction_amount":
            parse_money(
                get_value(
                    record,
                    "SANCTION_AMOUNT",
                )
            ),

        "actual_amount":
            parse_money(
                get_value(
                    record,
                    "ACTUAL_AMOUNT",
                )
            ),

        "letter_no":
            clean(
                get_value(
                    record,
                    "LETTER_NO",
                )
            ),

        "work_recommendation_detail_id":
            parse_int(
                get_value(
                    record,
                    "WORK_RECOMMENDATION_DTL_ID",
                    "WORK_RECOMMENDATION_DETAIL_ID",
                )
            ),

        "attach_id":
            clean(
                get_value(
                    record,
                    "ATTACH_ID",
                )
            ),

        "file_status":
            clean(
                get_value(
                    record,
                    "FILE_STATUS",
                )
            ),

        "average_rating":
            parse_money(
                get_value(
                    record,
                    "AVERAGE_RATING",
                )
            ),

        "source":
            SOURCE_NAME,

        "source_url":
            SOURCE_URL,

        "raw_record":
            record,

    }


# ============================================================
# DATABASE TABLES
# ============================================================

CREATE_METRICS_TABLE = """

CREATE TABLE IF NOT EXISTS mplads_mp_metrics (

    id BIGSERIAL PRIMARY KEY,

    source_record_id TEXT NOT NULL,

    mp_name TEXT,

    house TEXT,

    tenure TEXT,

    state TEXT,

    constituency TEXT,

    constituency_id INTEGER,

    allocated_limit NUMERIC(18,2),

    expenditure_completed_ongoing
        NUMERIC(18,2),

    works_recommended_count
        INTEGER,

    works_recommended_amount
        NUMERIC(18,2),

    works_sanctioned_count
        INTEGER,

    works_sanctioned_amount
        NUMERIC(18,2),

    works_completed_count
        INTEGER,

    works_completed_amount
        NUMERIC(18,2),

    calamity_count
        INTEGER,

    calamity_amount
        NUMERIC(18,2),

    source TEXT NOT NULL
        DEFAULT 'MPLADS / eSAKSHI',

    source_url TEXT,

    synced_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    UNIQUE(source_record_id)

);

"""


CREATE_WORKS_TABLE = """

CREATE TABLE IF NOT EXISTS mplads_works (

    id BIGSERIAL PRIMARY KEY,

    source_record_id TEXT NOT NULL,

    work_id TEXT,

    mp_name TEXT,

    house TEXT,

    tenure TEXT,

    state TEXT,

    constituency TEXT,

    constituency_id INTEGER,

    district_authority TEXT,

    work_category TEXT,

    activity_name TEXT,

    work_description TEXT,

    work_stage TEXT,

    work_status TEXT NOT NULL,

    recommendation_date DATE,

    sanction_date DATE,

    actual_end_date DATE,

    recommended_amount NUMERIC(18,2),

    sanction_amount NUMERIC(18,2),

    actual_amount NUMERIC(18,2),

    letter_no TEXT,

    work_recommendation_detail_id BIGINT,

    attach_id TEXT,

    file_status TEXT,

    average_rating NUMERIC(12,4),

    source TEXT NOT NULL
        DEFAULT 'MPLADS / eSAKSHI',

    source_url TEXT,

    raw_record JSONB,

    synced_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT NOW(),

    UNIQUE(
        source_record_id,
        work_status
    )

);

"""


# ============================================================
# CONNECTION
# ============================================================

def connect_database():

    database_url = os.environ.get(
        "DATABASE_URL"
    )

    if not database_url:

        print(
            "ERROR: DATABASE_URL is not set."
        )

        print()

        print(
            '$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/janpratinidhi"'
        )

        sys.exit(1)

    print(
        "Connecting to PostgreSQL..."
    )

    try:

        connection = psycopg2.connect(
            database_url
        )

        print(
            "✓ PostgreSQL connection established"
        )

        return connection

    except psycopg2.OperationalError as error:

        print()
        print(
            "ERROR: PostgreSQL connection failed:"
        )

        print(error)

        sys.exit(1)


# ============================================================
# DATABASE SETUP
# ============================================================

def setup_database(connection):

    with connection.cursor() as cursor:

        cursor.execute(
            CREATE_METRICS_TABLE
        )

        cursor.execute(
            CREATE_WORKS_TABLE
        )

        # Compatibility with the earlier importer.

        cursor.execute(
            """
            ALTER TABLE mplads_works
            ADD COLUMN IF NOT EXISTS source_url TEXT
            """
        )
        cursor.execute(
    """
    CREATE UNIQUE INDEX IF NOT EXISTS
    mplads_works_source_status_uidx
    ON mplads_works (source_record_id, work_status)
    """
)

        cursor.execute(
            """
            ALTER TABLE mplads_works
            ADD COLUMN IF NOT EXISTS raw_record JSONB
            """
        )
        cursor.execute(
    """
    ALTER TABLE mplads_works
    ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW()
    """
)

        cursor.execute(
            """
            ALTER TABLE mplads_mp_metrics
            ADD COLUMN IF NOT EXISTS source_url TEXT
            """
        )

    connection.commit()

    print(
        "✓ Database tables ready"
    )


# ============================================================
# SUMMARY PARSING
# ============================================================

def get_summary_metric(
    summary: dict[str, Any],
    phrase: str,
):

    for key, value in summary.items():

        if phrase.lower() in str(key).lower():

            value = decode_json_string(
                value
            )

            if isinstance(
                value,
                list,
            ):

                count = None
                amount = None

                for item in value:

                    if count is None:
                        count = parse_int(
                            item
                        )

                    if amount is None:
                        amount = parse_money(
                            item
                        )

                return count, amount

            return (
                None,
                parse_money(value),
            )

    return None, None


def extract_summary_objects(
    obj: Any,
):

    obj = decode_json_string(obj)

    if isinstance(
        obj,
        dict,
    ):

        if any(
            "works recommended"
            in str(key).lower()
            for key in obj
        ):

            return [obj]

        result = []

        for value in obj.values():

            if isinstance(
                value,
                (dict, list, str),
            ):

                result.extend(
                    extract_summary_objects(
                        value
                    )
                )

        return (
            result
            or [obj]
        )

    if isinstance(
        obj,
        list,
    ):

        return [
            item
            for item in obj
            if isinstance(
                item,
                dict,
            )
        ]

    return []


# ============================================================
# IMPORT MP METRICS
# ============================================================

def import_mp_metrics(
    connection,
    summary_raw,
    works,
):

    summaries = extract_summary_objects(
        summary_raw
    )

    if not summaries:

        print(
            "WARNING: No MP summary found."
        )

        return

    for summary in summaries:

        recommended_count, recommended_amount = (
            get_summary_metric(
                summary,
                "Works Recommended",
            )
        )

        sanctioned_count, sanctioned_amount = (
            get_summary_metric(
                summary,
                "Works Sanctioned",
            )
        )

        completed_count, completed_amount = (
            get_summary_metric(
                summary,
                "Works Completed",
            )
        )

        _, allocated_limit = (
            get_summary_metric(
                summary,
                "Allocated Limit",
            )
        )

        _, expenditure = (
            get_summary_metric(
                summary,
                "Expenditure on Completed and On-going Works",
            )
        )

        calamity_count, calamity_amount = (
            get_summary_metric(
                summary,
                "Amount consented for Calamity",
            )
        )

        first_work = (
            works[0]
            if works
            else {}
        )

        mp_name = (
            clean(
                get_value(
                    summary,
                    "MP_NAME",
                )
            )
            or first_work.get(
                "mp_name"
            )
            or "Unknown MP"
        )

        state = (
            clean(
                get_value(
                    summary,
                    "STATE_NAME",
                    "STATE",
                )
            )
            or first_work.get(
                "state"
            )
        )

        constituency = (
            clean(
                get_value(
                    summary,
                    "CONSTITUENCY",
                    "CONSTITUENCY_NAME",
                )
            )
            or first_work.get(
                "constituency"
            )
        )

        constituency_id = (
            parse_int(
                get_value(
                    summary,
                    "CONSTITUENCY_ID",
                )
            )
            or first_work.get(
                "constituency_id"
            )
        )

        tenure = (
            clean(
                get_value(
                    summary,
                    "TENURE",
                )
            )
            or "18th Lok Sabha"
        )

        identity = "|".join(
            [
                mp_name,
                state or "",
                constituency or "",
                str(
                    constituency_id
                    or ""
                ),
                tenure,
            ]
        )

        source_record_id = (
            "summary-"
            + hashlib.sha256(
                identity.encode(
                    "utf-8"
                )
            ).hexdigest()[:24]
        )

        sql = """

        INSERT INTO mplads_mp_metrics (

            source_record_id,

            mp_name,

            house,

            tenure,

            state,

            constituency,

            constituency_id,

            allocated_limit,

            expenditure_completed_ongoing,

            works_recommended_count,

            works_recommended_amount,

            works_sanctioned_count,

            works_sanctioned_amount,

            works_completed_count,

            works_completed_amount,

            calamity_count,

            calamity_amount,

            source,

            source_url,

            synced_at,

            updated_at

        )

        VALUES (

            %s,%s,'lok_sabha',%s,%s,%s,%s,

            %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,

            %s,%s,NOW(),NOW()

        )

        ON CONFLICT (
            source_record_id
        )

        DO UPDATE SET

            mp_name =
                EXCLUDED.mp_name,

            house =
                EXCLUDED.house,

            tenure =
                EXCLUDED.tenure,

            state =
                EXCLUDED.state,

            constituency =
                EXCLUDED.constituency,

            constituency_id =
                EXCLUDED.constituency_id,

            allocated_limit =
                EXCLUDED.allocated_limit,

            expenditure_completed_ongoing =
                EXCLUDED.expenditure_completed_ongoing,

            works_recommended_count =
                EXCLUDED.works_recommended_count,

            works_recommended_amount =
                EXCLUDED.works_recommended_amount,

            works_sanctioned_count =
                EXCLUDED.works_sanctioned_count,

            works_sanctioned_amount =
                EXCLUDED.works_sanctioned_amount,

            works_completed_count =
                EXCLUDED.works_completed_count,

            works_completed_amount =
                EXCLUDED.works_completed_amount,

            calamity_count =
                EXCLUDED.calamity_count,

            calamity_amount =
                EXCLUDED.calamity_amount,

            source =
                EXCLUDED.source,

            source_url =
                EXCLUDED.source_url,

            synced_at =
                NOW(),

            updated_at =
                NOW()

        """

        with connection.cursor() as cursor:

            cursor.execute(
                sql,
                (
                    source_record_id,
                    mp_name,
                    tenure,
                    state,
                    constituency,
                    constituency_id,
                    allocated_limit,
                    expenditure,
                    recommended_count,
                    recommended_amount,
                    sanctioned_count,
                    sanctioned_amount,
                    completed_count,
                    completed_amount,
                    calamity_count,
                    calamity_amount,
                    SOURCE_NAME,
                    SOURCE_URL,
                ),
            )

        print()

        print(
            f"✓ MP metrics imported: {mp_name}"
        )

        print(
            f"  Recommended: {recommended_count}"
        )

        print(
            f"  Sanctioned: {sanctioned_count}"
        )

        print(
            f"  Completed: {completed_count}"
        )

    connection.commit()


# ============================================================
# WORK IMPORT
# ============================================================

WORK_COLUMNS = [

    "source_record_id",

    "work_id",

    "mp_name",

    "house",

    "tenure",

    "state",

    "constituency",

    "constituency_id",

    "district_authority",

    "work_category",

    "activity_name",

    "work_description",

    "work_stage",

    "work_status",

    "recommendation_date",

    "sanction_date",

    "actual_end_date",

    "recommended_amount",

    "sanction_amount",

    "actual_amount",

    "letter_no",

    "work_recommendation_detail_id",

    "attach_id",

    "file_status",

    "average_rating",

    "source",

    "source_url",

    "raw_record",

]


def import_works(
    connection,
    works,
):

    if not works:

        print(
            "WARNING: No work records found."
        )

        return

    rows = []

    for work in works:

        source_record_id = clean(
            work.get(
                "source_record_id"
            )
        )

        # This should never happen now,
        # but keep this guard as a final
        # database safety check.

        if not source_record_id:

            print(
                "WARNING: Skipping work "
                "without source ID:"
            )

            print(
                work.get(
                    "mp_name"
                ),
                work.get(
                    "activity_name"
                ),
            )

            continue

        row = []

        for column in WORK_COLUMNS:

            value = work.get(
                column
            )

            if column == "raw_record":

                value = Json(value)

            row.append(value)

        rows.append(
            tuple(row)
        )

    if not rows:

        print(
            "WARNING: No valid work rows."
        )

        return

    # Do not specify a conflict target.
    #
    # This makes the importer compatible with
    # the earlier version of the table as well.

    assignments = ", ".join(

        f"{column}=EXCLUDED.{column}"

        for column in WORK_COLUMNS

        if column not in {
            "source_record_id",
            "source",
        }

    )

    assignments += (
        ", updated_at=NOW(), "
        "synced_at=NOW()"
    )

    sql = f"""

    INSERT INTO mplads_works (

        {", ".join(WORK_COLUMNS)}

    )

    VALUES %s

  ON CONFLICT (source_record_id, work_status)
DO UPDATE SET

        {assignments}

    """

    print()

    print(
        f"Inserting/updating "
        f"{len(rows)} work records..."
    )

    with connection.cursor() as cursor:

        execute_values(
            cursor,
            sql,
            rows,
            page_size=100,
        )

    connection.commit()

    print(
        f"✓ Works imported: {len(rows)}"
    )


# ============================================================
# READ WORK FILES
# ============================================================

def read_all_work_files():

    combined = []

    sources = [

        (
            RECOMMENDED_FILE,
            "recommended",
        ),

        (
            SANCTIONED_FILE,
            "sanctioned",
        ),

        (
            COMPLETED_FILE,
            "completed",
        ),

    ]

    for path, status in sources:

        raw = load_json(
            path
        )

        if raw is None:
            continue

        raw_records = extract_records(
            raw
        )

        print(
            f"{path.name}: "
            f"{len(raw_records)} "
            f"raw {status} records"
        )

        for record in raw_records:

            combined.append(
                normalize_work(
                    record,
                    status,
                )
            )

    # Deduplicate records in memory.

    unique = {}

    for work in combined:

        key = (

            work[
                "source_record_id"
            ],

            work[
                "work_status"
            ],

        )

        unique[key] = work

    return (
        list(
            unique.values()
        ),
        len(combined),
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    print("=" * 68)

    print(
        "JANPRATINIDHI MPLADS IMPORTER"
    )

    print("=" * 68)

    print()

    connection = (
        connect_database()
    )

    try:

        setup_database(
            connection
        )

        print()

        print(
            "Reading MP summary..."
        )

        summary = load_json(
            SUMMARY_FILE
        )

        if summary is not None:

            print(
                "✓ MP summary loaded"
            )

        print()

        print(
            "Reading work records..."
        )

        works, raw_count = (
            read_all_work_files()
        )

        print()

        print(
            f"Raw work records: "
            f"{raw_count}"
        )

        print(
            f"Unique work records: "
            f"{len(works)}"
        )

        # Import MP-level summary.

        if summary is not None:

            import_mp_metrics(
                connection,
                summary,
                works,
            )

        # Import all work records.

        import_works(
            connection,
            works,
        )

        print()

        print("=" * 68)

        print(
            "MPLADS IMPORT COMPLETE"
        )

        print("=" * 68)

        print()

        print(
            "Source:"
        )

        print(
            SOURCE_URL
        )

        print()

        print(
            "PostgreSQL tables:"
        )

        print(
            "  mplads_mp_metrics"
        )

        print(
            "  mplads_works"
        )

        print()

    except Exception as error:

        connection.rollback()

        print()

        print("=" * 68)

        print(
            "IMPORT FAILED"
        )

        print("=" * 68)

        print()

        print(
            f"{type(error).__name__}: "
            f"{error}"
        )

        print()

        print(
            "Database transaction rolled back."
        )

        print()

        raise

    finally:

        connection.close()


if __name__ == "__main__":

    main()