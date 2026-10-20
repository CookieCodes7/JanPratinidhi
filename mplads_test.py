import json
import time
from typing import Any

import requests


BASE_URL = "https://mplads.mospi.gov.in"
SESSION_URL = f"{BASE_URL}/digigov/dashboard.html"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/140.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": BASE_URL,
    "Referer": SESSION_URL,
    "X-Requested-With": "XMLHttpRequest",
}


class MPLADSClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def connect(self):
        print("Connecting to eSAKSHI...")

        response = self.session.get(
            SESSION_URL,
            timeout=30,
        )

        response.raise_for_status()

        print("✓ eSAKSHI session established")
        print(f"  HTTP status: {response.status_code}")

    def post(self, endpoint: str, payload: dict[str, Any]):
        url = f"{BASE_URL}{endpoint}"

        print(f"\nPOST {endpoint}")
        print(f"Payload: {json.dumps(payload)}")

        response = self.session.post(
            url,
            json=payload,
            timeout=60,
        )

        print(f"HTTP status: {response.status_code}")

        response.raise_for_status()

        try:
            data = response.json()
        except ValueError:
            print("\nServer returned non-JSON response:")
            print(response.text[:2000])
            raise

        return data

    def get_states(self):
        return self.post(
            "/rest/PreLoginDashboardData/getStateData",
            {},
        )

    def get_constituencies(self, state_id):
        return self.post(
            "/rest/PreLoginDashboardData/getConstituencyData",
            {
                "id": str(state_id),
            },
        )

    def get_mps(self, constituency_id, tenure_id=7):
        return self.post(
            "/rest/PreLoginDashboardData/getMpAndConstCombo",
            {
                "const_combo": f"{constituency_id},2,{tenure_id}",
            },
        )

    def get_mp_summary(
        self,
        state_id,
        constituency_id,
        mp_id,
        tenure_id=7,
    ):
        return self.post(
            "/rest/PreLoginDashboardData/getTilesData",
            {
                "uname": (
                    f"{state_id},"
                    f"{constituency_id},"
                    f"{mp_id},"
                    f"2,"
                    f"{tenure_id}"
                ),
            },
        )

    def get_works(
        self,
        state_id,
        constituency_id,
        mp_id,
        work_type,
        tenure_id=7,
    ):
        return self.post(
            "/rest/PreLoginDashboardData/getTilesReportData",
            {
                "combo": (
                    f"{state_id},"
                    f"{constituency_id},"
                    f"{mp_id},"
                    f"2,"
                    f"{tenure_id}"
                ),
                "key": work_type,
            },
        )


def save_json(filename, data):
    with open(
        filename,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            data,
            f,
            indent=2,
            ensure_ascii=False,
        )


def print_section(title):
    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


def main():

    # ---------------------------------------------------------
    # Configuration
    # ---------------------------------------------------------

    # Rajasthan
    state_id = 28
    state_name = "Rajasthan"

    # Current Lok Sabha
    tenure_id = 7

    client = MPLADSClient()

    # ---------------------------------------------------------
    # 1. Connect
    # ---------------------------------------------------------

    client.connect()

    time.sleep(1)

    # ---------------------------------------------------------
    # 2. Get states
    # ---------------------------------------------------------

    states = client.get_states()

    save_json(
        "mplads_states.json",
        states,
    )

    print_section("STATES")

    print(f"States returned: {len(states)}")

    rajasthan = next(
        (
            state
            for state in states
            if state.get("STATE_ID") == state_id
        ),
        None,
    )

    if not rajasthan:
        raise RuntimeError(
            "Rajasthan was not found in the eSAKSHI state response."
        )

    print(
        f"✓ Selected: "
        f"{rajasthan['STATE_NAME']} "
        f"(ID {rajasthan['STATE_ID']})"
    )

    # ---------------------------------------------------------
    # 3. Get constituencies
    # ---------------------------------------------------------

    time.sleep(1)

    constituencies = client.get_constituencies(
        state_id
    )

    save_json(
        "mplads_rajasthan_constituencies.json",
        constituencies,
    )

    print_section("RAJASTHAN CONSTITUENCIES")

    print(
        f"Constituencies returned: "
        f"{len(constituencies)}"
    )

    for constituency in constituencies[:10]:
        print(
            constituency
        )

    if not constituencies:
        raise RuntimeError(
            "No Rajasthan constituencies were returned."
        )

    # ---------------------------------------------------------
    # 4. Select first constituency
    # ---------------------------------------------------------

    selected_constituency = constituencies[0]

    print()
    print(
        "Selected first constituency:"
    )
    print(
        json.dumps(
            selected_constituency,
            indent=2,
            ensure_ascii=False,
        )
    )

    # Try to determine the constituency ID.
    constituency_id = (
        selected_constituency.get("CONSTITUENCY_ID")
        or selected_constituency.get("CONST_ID")
        or selected_constituency.get("id")
        or selected_constituency.get("ID")
    )

    if constituency_id is None:
        raise RuntimeError(
            "Could not determine constituency ID. "
            "Check mplads_rajasthan_constituencies.json."
        )

    print(
        f"\n✓ Constituency ID: {constituency_id}"
    )

    # ---------------------------------------------------------
    # 5. Get MPs
    # ---------------------------------------------------------

    time.sleep(1)

    mps = client.get_mps(
        constituency_id,
        tenure_id,
    )

    save_json(
        "mplads_constituency_mps.json",
        mps,
    )

    print_section("MP RESPONSE")

    print(
        json.dumps(
            mps,
            indent=2,
            ensure_ascii=False,
        )[:10000]
    )

    # ---------------------------------------------------------
    # 6. Find MP ID
    # ---------------------------------------------------------

    mp_id = None

    if isinstance(mps, list):
        if mps:
            first_mp = mps[0]

            mp_id = (
                first_mp.get("MP_ID")
                or first_mp.get("MPID")
                or first_mp.get("id")
                or first_mp.get("ID")
            )

    elif isinstance(mps, dict):
        mp_id = (
            mps.get("MP_ID")
            or mps.get("MPID")
            or mps.get("id")
            or mps.get("ID")
        )

    if mp_id is None:
        raise RuntimeError(
            "Could not determine MP ID. "
            "Check mplads_constituency_mps.json."
        )

    print(
        f"\n✓ Selected MP ID: {mp_id}"
    )

    # ---------------------------------------------------------
    # 7. Get MP financial summary
    # ---------------------------------------------------------

    time.sleep(1)

    summary = client.get_mp_summary(
        state_id=state_id,
        constituency_id=constituency_id,
        mp_id=mp_id,
        tenure_id=tenure_id,
    )

    save_json(
        "mplads_mp_summary.json",
        summary,
    )

    print_section("MP FINANCIAL SUMMARY")

    print(
        json.dumps(
            summary,
            indent=2,
            ensure_ascii=False,
        )[:15000]
    )

    # ---------------------------------------------------------
    # 8. Get recommended works
    # ---------------------------------------------------------

    time.sleep(1)

    recommended = client.get_works(
        state_id=state_id,
        constituency_id=constituency_id,
        mp_id=mp_id,
        work_type="Works Recommended",
        tenure_id=tenure_id,
    )

    save_json(
        "mplads_works_recommended.json",
        recommended,
    )

    print_section("WORKS RECOMMENDED")

    print(
        json.dumps(
            recommended,
            indent=2,
            ensure_ascii=False,
        )[:15000]
    )

    # ---------------------------------------------------------
    # 9. Get sanctioned works
    # ---------------------------------------------------------

    time.sleep(1)

    sanctioned = client.get_works(
        state_id=state_id,
        constituency_id=constituency_id,
        mp_id=mp_id,
        work_type="Works Sanctioned",
        tenure_id=tenure_id,
    )

    save_json(
        "mplads_works_sanctioned.json",
        sanctioned,
    )

    print_section("WORKS SANCTIONED")

    print(
        json.dumps(
            sanctioned,
            indent=2,
            ensure_ascii=False,
        )[:15000]
    )

    # ---------------------------------------------------------
    # 10. Get completed works
    # ---------------------------------------------------------

    time.sleep(1)

    completed = client.get_works(
        state_id=state_id,
        constituency_id=constituency_id,
        mp_id=mp_id,
        work_type="Works Completed",
        tenure_id=tenure_id,
    )

    save_json(
        "mplads_works_completed.json",
        completed,
    )

    print_section("WORKS COMPLETED")

    print(
        json.dumps(
            completed,
            indent=2,
            ensure_ascii=False,
        )[:15000]
    )

    # ---------------------------------------------------------
    # Finished
    # ---------------------------------------------------------

    print_section(
        "✓ MPLADS LIVE DATA TEST COMPLETE"
    )

    print(
        """
The following files were created:

  mplads_states.json
  mplads_rajasthan_constituencies.json
  mplads_constituency_mps.json
  mplads_mp_summary.json
  mplads_works_recommended.json
  mplads_works_sanctioned.json
  mplads_works_completed.json

The next step is to inspect the exact JSON structures
and build the PostgreSQL importer around them.
"""
    )


if __name__ == "__main__":
    main()