import json
import os
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values


BASE_DIR = Path(__file__).resolve().parent


def load_json(filename):
    path = BASE_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"Missing file: {filename}"
        )

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def parse_money(value):
    """
    Convert values such as:

        500000
        " 10,72,44,034.00"
        " 10.72 Crore"

    into Decimal where possible.
    """

    if value is None:
        return None

    if isinstance(value, (int, float)):
        return Decimal(str(value))

    text = str(value).strip()

    if not text:
        return None

    # Remove rupee symbol, commas and whitespace.
    text = (
        text
        .replace("₹", "")
        .replace(",", "")
        .replace(" ", "")
    )

    # Handle crore display values.
    crore_match = re.match(
        r"^([0-9.]+)\s*Crore$",
        text,
        re.IGNORECASE,
    )

    if crore_match:
        return (
            Decimal(crore_match.group(1))
            * Decimal("10000000")
        )

    try:
        return Decimal(text)
    except Exception:
        return None


def parse_date(value):
    if not value:
        return None

    value = str(value).strip()

    formats = [
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%b %d, %Y %I:%M:%S %p",
        "%B %d, %Y %I:%M:%S %p",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(
                value,
                fmt,
            ).date()
        except ValueError:
            pass

    return None


def parse_embedded_json(value):
    """
    Some eSAKSHI responses return:

        "Total Works Recommended": "[{...}]"

    instead of a native JSON array.
    """

    if isinstance(value, list):
        return value

    if isinstance(value, dict):
        return [value]

    if not isinstance(value, str):
        return []

    value = value.strip()

    if not value:
        return []

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return []


def normalize_work(record, status):
    """
    Convert an eSAKSHI work into our internal representation.
    """

    work_id = (
        record.get("WORK_ID")
        or record.get("WORK_RECOMMENDATION_DTL_ID")
    )

    return {
        "source_record_id": str(work_id)
        if work_id is not None
        else None,

        "work_id": work_id,

        "mp_name": record.get("MP_NAME"),

        "house": (
            "lok_sabha"
            if record.get("HOUSE_OF_PARLIAMENT") == 2
            else None
        ),

        "tenure": record.get("TENURE"),

        "state": record.get("STATE_NAME"),

        "constituency": record.get("CONSTITUENCY"),

        "constituency_id": record.get(
            "CONSTITUENCY_ID"
        ),

        "district_authority": record.get(
            "IDA_NAME"
        ),

        "work_category": record.get(
            "WORK_CATEGORY"
        ),

        "activity_name": record.get(
            "ACTIVITY_NAME"
        ),

        "work_description": record.get(
            "WORK_DESCRIPTION"
        ),

        "work_stage": record.get(
            "WORK_STAGE"
        ),

        "work_status": status,

        "recommendation_date": parse_date(
            record.get("RECOMMENDATION_DATE")
        ),

        "sanction_date": parse_date(
            record.get("SANCTION_DATE")
        ),

        "actual_end_date": parse_date(
            record.get("ACTUAL_END_DATE")
        ),

        "recommended_amount": parse_money(
            record.get("RECOMMENDED_AMOUNT")
        ),

        "sanction_amount": parse_money(
            record.get("SANCTION_AMOUNT")
        ),

        "actual_amount": parse_money(
            record.get("ACTUAL_AMOUNT")
        ),

        "letter_no": record.get(
            "LETTER_NO"
        ),

        "work_recommendation_detail_id": record.get(
            "WORK_RECOMMENDATION_DTL_ID"
        ),

        "attach_id": record.get(
            "ATTACH_ID"
        ),

        "file_status": record.get(
            "FILE_STATUS"
        ),

        "average_rating": record.get(
            "AVERAGE_RATING"
        ),

        "source": "MPLADS / eSAKSHI",
    }


def collect_works():

    recommended_response = load_json(
        "mplads_works_recommended.json"
    )

    sanctioned_response = load_json(
        "mplads_works_sanctioned.json"
    )

    completed_response = load_json(
        "mplads_works_completed.json"
    )

    recommended = parse_embedded_json(
        recommended_response.get(
            "Total Works Recommended"
        )
    )

    sanctioned = parse_embedded_json(
        sanctioned_response.get(
            "Total Sanction Work"
        )
    )

    completed = parse_embedded_json(
        completed_response
    )

    works = []

    for record in recommended:
        works.append(
            normalize_work(
                record,
                "recommended",
            )
        )

    for record in sanctioned:
        works.append(
            normalize_work(
                record,
                "sanctioned",
            )
        )

    for record in completed:
        works.append(
            normalize_work(
                record,
                "completed",
            )
        )

    return works


def create_tables(connection):

    with connection.cursor() as cursor:

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS mplads_mp_metrics (
                id BIGSERIAL PRIMARY KEY,

                source_record_id TEXT NOT NULL UNIQUE,

                mp_name TEXT NOT NULL,
                house TEXT,
                tenure TEXT,

                state TEXT,
                constituency TEXT,
                constituency_id INTEGER,

                allocated_limit NUMERIC(15,2),
                expenditure_completed_ongoing NUMERIC(15,2),

                works_recommended_count INTEGER,
                works_recommended_amount NUMERIC(15,2),

                works_sanctioned_count INTEGER,
                works_sanctioned_amount NUMERIC(15,2),

                works_completed_count INTEGER,
                works_completed_amount NUMERIC(15,2),

                calamity_count INTEGER,
                calamity_amount NUMERIC(15,2),

                source TEXT NOT NULL,

                synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS mplads_works (
                id BIGSERIAL PRIMARY KEY,

                source_record_id TEXT NOT NULL,
                work_id BIGINT,

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
                work_status TEXT,

                recommendation_date DATE,
                sanction_date DATE,
                actual_end_date DATE,

                recommended_amount NUMERIC(15,2),
                sanction_amount NUMERIC(15,2),
                actual_amount NUMERIC(15,2),

                letter_no TEXT,

                work_recommendation_detail_id BIGINT,

                attach_id BIGINT,

                file_status BOOLEAN,

                average_rating NUMERIC(12,6),

                source TEXT NOT NULL,

                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                UNIQUE(source_record_id, work_status)
            );
            """
        )

    connection.commit()


def get_mp_metrics():

    summary = load_json(
        "mplads_mp_summary.json"
    )

    allocated = summary.get(
        "Allocated Limit for Hon'ble MPs",
        [],
    )

    expenditure = summary.get(
        "Expenditure on Completed and On-going Works as on Date",
        [],
    )

    recommended = summary.get(
        "Works Recommended",
        [],
    )

    sanctioned = summary.get(
        "Works Sanctioned",
        [],
    )

    completed = summary.get(
        "Works Completed",
        [],
    )

    calamity = summary.get(
        "Amount consented for Calamity",
        [],
    )

    tenure = summary.get(
        "Current Tenure",
        [],
    )

    tenure_name = None

    if tenure:
        tenure_name = tenure[0].get(
            "CAPTION"
        )

    # Determine MP information from work data.
    works = collect_works()

    first_work = works[0] if works else {}

    return {
        "source_record_id": (
            f"{first_work.get('mp_name', 'unknown')}"
            f":{first_work.get('constituency_id', 'unknown')}"
            f":{tenure_name or 'unknown'}"
        ),

        "mp_name": first_work.get(
            "mp_name"
        ),

        "house": first_work.get(
            "house"
        ),

        "tenure": tenure_name,

        "state": first_work.get(
            "state"
        ),

        "constituency": first_work.get(
            "constituency"
        ),

        "constituency_id": first_work.get(
            "constituency_id"
        ),

        "allocated_limit": (
            parse_money(allocated[0])
            if allocated
            else None
        ),

        "expenditure_completed_ongoing": (
            parse_money(expenditure[0])
            if expenditure
            else None
        ),

        "works_recommended_count": (
            int(recommended[0])
            if recommended
            else None
        ),

        "works_recommended_amount": (
            parse_money(recommended[1])
            if len(recommended) > 1
            else None
        ),

        "works_sanctioned_count": (
            int(sanctioned[0])
            if sanctioned
            else None
        ),

        "works_sanctioned_amount": (
            parse_money(sanctioned[1])
            if len(sanctioned) > 1
            else None
        ),

        "works_completed_count": (
            int(completed[0])
            if completed
            else None
        ),

        "works_completed_amount": (
            parse_money(completed[1])
            if len(completed) > 1
            else None
        ),

        "calamity_count": (
            int(calamity[0])
            if calamity
            else None
        ),

        "calamity_amount": (
            parse_money(calamity[1])
            if len(calamity) > 1
            else None
        ),

        "source": "MPLADS / eSAKSHI",
    }


def insert_metrics(connection, metrics):

    with connection.cursor() as cursor:

        cursor.execute(
            """
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
                synced_at,
                updated_at
            )
            VALUES (
                %(source_record_id)s,
                %(mp_name)s,
                %(house)s,
                %(tenure)s,
                %(state)s,
                %(constituency)s,
                %(constituency_id)s,
                %(allocated_limit)s,
                %(expenditure_completed_ongoing)s,
                %(works_recommended_count)s,
                %(works_recommended_amount)s,
                %(works_sanctioned_count)s,
                %(works_sanctioned_amount)s,
                %(works_completed_count)s,
                %(works_completed_amount)s,
                %(calamity_count)s,
                %(calamity_amount)s,
                %(source)s,
                NOW(),
                NOW()
            )
            ON CONFLICT (source_record_id)
            DO UPDATE SET
                mp_name = EXCLUDED.mp_name,
                tenure = EXCLUDED.tenure,
                state = EXCLUDED.state,
                constituency = EXCLUDED.constituency,
                constituency_id = EXCLUDED.constituency_id,
                allocated_limit = EXCLUDED.allocated_limit,
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
                synced_at = NOW(),
                updated_at = NOW();
            """,
            metrics,
        )

    connection.commit()


def insert_works(connection, works):

    if not works:
        return

    rows = []

    for work in works:

        rows.append(
            (
                work["source_record_id"],
                work["work_id"],
                work["mp_name"],
                work["house"],
                work["tenure"],
                work["state"],
                work["constituency"],
                work["constituency_id"],
                work["district_authority"],
                work["work_category"],
                work["activity_name"],
                work["work_description"],
                work["work_stage"],
                work["work_status"],
                work["recommendation_date"],
                work["sanction_date"],
                work["actual_end_date"],
                work["recommended_amount"],
                work["sanction_amount"],
                work["actual_amount"],
                work["letter_no"],
                work["work_recommendation_detail_id"],
                work["attach_id"],
                work["file_status"],
                work["average_rating"],
                work["source"],
            )
        )

    with connection.cursor() as cursor:

        execute_values(
            cursor,
            """
            INSERT INTO mplads_works (
                source_record_id,
                work_id,
                mp_name,
                house,
                tenure,
                state,
                constituency,
                constituency_id,
                district_authority,
                work_category,
                activity_name,
                work_description,
                work_stage,
                work_status,
                recommendation_date,
                sanction_date,
                actual_end_date,
                recommended_amount,
                sanction_amount,
                actual_amount,
                letter_no,
                work_recommendation_detail_id,
                attach_id,
                file_status,
                average_rating,
                source
            )
            VALUES %s
            ON CONFLICT (
                source_record_id,
                work_status
            )
            DO UPDATE SET
                work_stage = EXCLUDED.work_stage,
                work_status = EXCLUDED.work_status,
                recommendation_date =
                    EXCLUDED.recommendation_date,
                sanction_date =
                    EXCLUDED.sanction_date,
                actual_end_date =
                    EXCLUDED.actual_end_date,
                recommended_amount =
                    EXCLUDED.recommended_amount,
                sanction_amount =
                    EXCLUDED.sanction_amount,
                actual_amount =
                    EXCLUDED.actual_amount,
                district_authority =
                    EXCLUDED.district_authority,
                updated_at = NOW();
            """,
            rows,
        )

    connection.commit()


def main():

    database_url = os.environ.get(
        "DATABASE_URL"
    )

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set."
        )

    print()
    print("=" * 70)
    print("JANPRATINIDHI MPLADS IMPORTER")
    print("=" * 70)

    print("\nConnecting to PostgreSQL...")

    connection = psycopg2.connect(
        database_url
    )

    print("✓ PostgreSQL connected")

    print("\nCreating MPLADS tables...")

    create_tables(connection)

    print("✓ Tables ready")

    # ---------------------------------------------------------
    # MP summary
    # ---------------------------------------------------------

    print("\nReading MP summary...")

    metrics = get_mp_metrics()

    print(
        f"MP: {metrics['mp_name']}"
    )

    print(
        f"Constituency: "
        f"{metrics['constituency']}"
    )

    print(
        f"Tenure: "
        f"{metrics['tenure']}"
    )

    print(
        f"Allocated: "
        f"₹{metrics['allocated_limit']}"
    )

    print(
        f"Recommended: "
        f"{metrics['works_recommended_count']} works / "
        f"₹{metrics['works_recommended_amount']}"
    )

    print(
        f"Sanctioned: "
        f"{metrics['works_sanctioned_count']} works / "
        f"₹{metrics['works_sanctioned_amount']}"
    )

    print(
        f"Completed: "
        f"{metrics['works_completed_count']} works / "
        f"₹{metrics['works_completed_amount']}"
    )

    insert_metrics(
        connection,
        metrics,
    )

    print("✓ MP metrics imported")

    # ---------------------------------------------------------
    # Works
    # ---------------------------------------------------------

    print("\nReading work records...")

    works = collect_works()

    print(
        f"Raw work records: {len(works)}"
    )

    insert_works(
        connection,
        works,
    )

    print(
        f"✓ {len(works)} work records imported"
    )

    # ---------------------------------------------------------
    # Verification
    # ---------------------------------------------------------

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM mplads_works;
            """
        )

        work_count = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM mplads_mp_metrics;
            """
        )

        metric_count = cursor.fetchone()[0]

    print()
    print("=" * 70)
    print("✓ MPLADS IMPORT COMPLETE")
    print("=" * 70)

    print(
        f"\nMPLADS MP metric records: {metric_count}"
    )

    print(
        f"MPLADS work records: {work_count}"
    )

    print(
        "\nSource: MPLADS / eSAKSHI"
    )

    connection.close()


if __name__ == "__main__":
    main()