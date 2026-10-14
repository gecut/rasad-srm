#!/usr/bin/env python3
"""
import-students-to-production.py
Imports student records and necessary dependent data (neighborhoods)
directly into Production Payload CMS (https://cms.rasad.gecut.ir) via REST API.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

PROD_URL = os.environ.get("PROD_URL", "https://cms.rasad.gecut.ir")
EMAIL = os.environ.get("PAYLOAD_EMAIL", "antigravity@google.com")
PASSWORD = os.environ.get("PAYLOAD_PASSWORD", "agent")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
STUDENTS_JSON = os.path.join(ROOT_DIR, "data", "students.json")
NEIGHBORHOODS_JSON = os.path.join(ROOT_DIR, "data", "neighborhoods.json")

class PayloadClient:
    def __init__(self, base_url, email, password):
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.password = password
        self.token = None
        self.login()

    def login(self):
        login_url = f"{self.base_url}/api/users/login"
        payload = json.dumps({"email": self.email, "password": self.password}).encode("utf-8")
        req = urllib.request.Request(
            login_url,
            headers={"Content-Type": "application/json"},
            data=payload
        )
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())
                self.token = data.get("token")
                print(f"✓ Authenticated successfully with {self.base_url} (User: {data.get('user', {}).get('name')})")
        except Exception as e:
            print(f"✗ Failed to log in to {login_url}: {e}")
            sys.exit(1)

    def request(self, endpoint, method="GET", data=None, retries=3):
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "User-Agent": "Rasad-Importer/1.0"
        }
        encoded_data = json.dumps(data).encode("utf-8") if data is not None else None

        for attempt in range(1, retries + 1):
            req = urllib.request.Request(url, headers=headers, data=encoded_data, method=method)
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    return json.loads(resp.read().decode())
            except urllib.error.HTTPError as e:
                err_body = e.read().decode()
                if e.code == 401 and attempt < retries:
                    self.login()
                    headers["Authorization"] = f"Bearer {self.token}"
                    continue
                if attempt == retries:
                    raise Exception(f"HTTP {e.code} for {method} {url}: {err_body}")
                time.sleep(1 * attempt)
            except Exception as e:
                if attempt == retries:
                    raise Exception(f"Network error for {method} {url}: {e}")
                time.sleep(1 * attempt)

def main():
    print("=============================================================")
    print("  Rasad SRM — Production Student Data Import Pipeline")
    print("=============================================================")

    client = PayloadClient(PROD_URL, EMAIL, PASSWORD)

    # 1. Sync Neighborhoods (mandatory dependent data)
    print("\n1. Checking and synchronizing Mashhad neighborhoods...")
    if not os.path.exists(NEIGHBORHOODS_JSON):
        print(f"Error: {NEIGHBORHOODS_JSON} not found!")
        sys.exit(1)

    with open(NEIGHBORHOODS_JSON, "r", encoding="utf-8") as f:
        neigh_items = json.load(f)

    # Fetch existing neighborhoods from prod
    existing_neigh_res = client.request("/api/neighborhoods?limit=100")
    existing_neigh_docs = existing_neigh_res.get("docs", [])
    neighborhood_map = {n["name"].strip(): n["id"] for n in existing_neigh_docs}

    created_neigh = 0
    for n in neigh_items:
        name = n["name"].strip()
        if name not in neighborhood_map:
            sub_districts = [{"name": s} for s in n.get("subDistricts", [])]
            res = client.request(
                "/api/neighborhoods",
                method="POST",
                data={
                    "name": name,
                    "description": n.get("description"),
                    "subDistricts": sub_districts,
                },
            )
            n_id = res.get("doc", {}).get("id")
            neighborhood_map[name] = n_id
            created_neigh += 1

    print(f"   ✓ Neighborhoods: {created_neigh} created, {len(neighborhood_map)} total available.")

    # 2. Load Students
    if not os.path.exists(STUDENTS_JSON):
        print(f"Error: {STUDENTS_JSON} not found!")
        sys.exit(1)

    with open(STUDENTS_JSON, "r", encoding="utf-8") as f:
        students_data = json.load(f)

    print(f"\n2. Loading {len(students_data)} students from {STUDENTS_JSON}...")

    # Check existing count in production
    initial_check = client.request("/api/students?limit=1")
    initial_count = initial_check.get("totalDocs", 0)
    print(f"   Current students in production: {initial_count}")

    # Build student payloads
    prepared_students = []
    for st in students_data:
        # Neighborhood relation
        neigh_name = st.get("neighborhood")
        neigh_id = None
        if neigh_name:
            norm_neigh = neigh_name.strip()
            if norm_neigh == "وکیل اباد راست":
                norm_neigh = "وکیل آباد راست"
            neigh_id = neighborhood_map.get(norm_neigh)

        # Lifecycle status:
        # In prod, classes are not imported, so students cannot be referred_to_teacher
        # per invariant: referred_to_teacher requires currentClass.
        # Thus, if referred_to_teacher in json, set to class_seeker for prod.
        lifecycle = st.get("lifecycleStatus")
        if lifecycle == "referred_to_teacher":
            lifecycle = "class_seeker"

        # Notes composition
        note_parts = []
        if st.get("currentClass"):
            note_parts.append(f"کلاس تحویلی در اکسل: {st['currentClass']}")
        if st.get("ceremonies") and isinstance(st["ceremonies"], dict):
            c_items = [f"{k} (سانس {v})" for k, v in st["ceremonies"].items()]
            note_parts.append("سوابق حضور در مراسم: " + "، ".join(c_items))
        if st.get("notes"):
            note_parts.append(st["notes"])

        doc = {
            "firstName": st["firstName"],
            "lastName": st["lastName"],
            "grade": st.get("grade"),
            "origin": "import",
            "readinessStatus": st.get("readinessStatus", "normal"),
            "lifecycleStatus": lifecycle or "unknown",
            "fatherMobile": st.get("fatherMobile"),
            "motherMobile": st.get("motherMobile"),
            "mobile": st.get("mobile"),
            "landline": st.get("landline"),
            "neighborhood": neigh_id,
            "address": st.get("address"),
            "referrer": st.get("referrer"),
            "notes": " | ".join(note_parts) if note_parts else None,
        }
        # Clean None values
        clean_doc = {k: v for k, v in doc.items() if v is not None}
        prepared_students.append(clean_doc)

    print(f"\n3. Importing {len(prepared_students)} student records to production via REST API...")
    start_time = time.time()

    success_count = 0
    fail_count = 0
    errors = []

    def post_student(student_doc, idx):
        nonlocal client
        try:
            client.request("/api/students", method="POST", data=student_doc)
            return (True, idx, None)
        except Exception as e:
            return (False, idx, f"{student_doc.get('firstName')} {student_doc.get('lastName')}: {str(e)}")

    # Concurrency with ThreadPoolExecutor
    max_workers = 8
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(post_student, doc, i): i for i, doc in enumerate(prepared_students)}
        for future in as_completed(futures):
            success, idx, err = future.result()
            if success:
                success_count += 1
            else:
                fail_count += 1
                errors.append(err)

            processed = success_count + fail_count
            if processed % 100 == 0 or processed == len(prepared_students):
                elapsed = time.time() - start_time
                rate = processed / elapsed if elapsed > 0 else 0
                print(f"   [{processed}/{len(prepared_students)}] Success: {success_count} | Failed: {fail_count} | Speed: {rate:.1f} rec/s")

    elapsed_total = time.time() - start_time
    print(f"\n✓ Finished import in {elapsed_total:.2f} seconds ({len(prepared_students)/elapsed_total:.1f} records/sec)")
    print(f"  Successfully imported: {success_count}")
    print(f"  Failed:               {fail_count}")

    if errors:
        print("\nErrors encountered (first 10):")
        for err in errors[:10]:
            print(f"  - {err}")

    # 4. Final verification in Production
    final_check = client.request("/api/students?limit=5")
    final_count = final_check.get("totalDocs", 0)
    print(f"\n=============================================================")
    print(f"  Final Verification in Production: {final_count} students exist.")
    print("=============================================================")
    for d in final_check.get("docs", []):
        neigh_name = d.get("neighborhood", {}).get("name") if isinstance(d.get("neighborhood"), dict) else d.get("neighborhood")
        print(f"  • ID {d.get('id')}: {d.get('firstName')} {d.get('lastName')} | پایه {d.get('grade')} | {d.get('readinessStatus')}/{d.get('lifecycleStatus')} | محله: {neigh_name}")

if __name__ == "__main__":
    main()
