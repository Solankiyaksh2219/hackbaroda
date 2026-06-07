"""
Production Readiness Test Suite
Tests all API endpoints with realistic multi-channel feedback data.
"""
import time, requests, json, sys

BASE = "http://localhost:8000"
FRONTEND = "http://localhost:3000"

TESTS_PASSED = 0
TESTS_FAILED = 0

def check(name, condition, detail=""):
    global TESTS_PASSED, TESTS_FAILED
    if condition:
        TESTS_PASSED += 1
        print(f"  ✓ {name}")
    else:
        TESTS_FAILED += 1
        print(f"  ✗ {name} — {detail}")

# --- Wait for backend ---
print("=" * 60)
print("PRODUCTION READINESS TEST SUITE")
print("=" * 60)

print("\n[1/5] Checking backend health...")
for i in range(15):
    try:
        r = requests.get(f"{BASE}/api/health", timeout=3)
        if r.status_code == 200:
            break
    except:
        pass
    time.sleep(2)
else:
    print("  ✗ Backend not reachable. Aborting.")
    sys.exit(1)
check("Backend /api/health returns 200", r.status_code == 200)
check("Health response has status=ok", r.json().get("status") == "ok")

# --- Check frontend ---
print("\n[2/5] Checking frontend availability...")
try:
    r = requests.get(FRONTEND, timeout=5)
    check("Frontend returns 200", r.status_code == 200)
    check("Frontend contains app title", "Feedback Agent" in r.text or "feedback" in r.text.lower())
except Exception as e:
    check("Frontend reachable", False, str(e))

# --- Ingest multi-channel feedback ---
print("\n[3/5] Testing /api/ingest with multi-channel feedback...")

feedbacks = [
    {
        "source": "twitter",
        "raw_text": "Love the new dark mode! Finally my eyes don't burn at night. But the notification sounds are way too loud."
    },
    {
        "source": "app_store",
        "raw_text": "App crashes every time I try to upload a photo. Very frustrating. The UI is beautiful though, and customer support responded quickly."
    },
    {
        "source": "email",
        "raw_text": "We've been using your enterprise plan for 6 months. The analytics dashboard is incredibly powerful, but we need better CSV export options and SSO integration."
    },
]

ingest_results = []
for fb in feedbacks:
    try:
        r = requests.post(f"{BASE}/api/ingest", json=fb, timeout=30)
        data = r.json()
        ingest_results.append(data)
        check(
            f"Ingest [{fb['source']}] → status 200",
            r.status_code == 200,
            f"got {r.status_code}: {data}"
        )
        if r.status_code == 200:
            check(
                f"  sentiment is 0-100",
                isinstance(data.get("sentiment"), int) and 0 <= data["sentiment"] <= 100,
                f"got {data.get('sentiment')}"
            )
            check(
                f"  themes is non-empty list",
                isinstance(data.get("themes"), list) and len(data["themes"]) > 0,
                f"got {data.get('themes')}"
            )
            check(
                f"  source matches '{fb['source']}'",
                data.get("source") == fb["source"],
                f"got {data.get('source')}"
            )
    except Exception as e:
        check(f"Ingest [{fb['source']}]", False, str(e))

# --- Trends ---
print("\n[4/5] Testing /api/trends (RAG over Supabase memory)...")
try:
    r = requests.get(f"{BASE}/api/trends", timeout=30)
    data = r.json()
    check("Trends returns 200", r.status_code == 200, f"got {r.status_code}")
    if r.status_code == 200:
        check(
            "actionable_initiative is non-empty string",
            isinstance(data.get("actionable_initiative"), str) and len(data["actionable_initiative"]) > 20,
            f"got: {data.get('actionable_initiative')}"
        )
        check(
            "history contains entries",
            isinstance(data.get("history"), list) and len(data["history"]) >= 3,
            f"got {len(data.get('history', []))} entries"
        )
        if data.get("history"):
            entry = data["history"][0]
            check(
                "history entries have correct schema",
                all(k in entry for k in ["created_at", "sentiment", "source", "themes"]),
                f"keys: {list(entry.keys())}"
            )
except Exception as e:
    check("Trends endpoint", False, str(e))

# --- CORS ---
print("\n[5/5] Testing CORS headers...")
try:
    r = requests.options(f"{BASE}/api/ingest", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }, timeout=5)
    cors_origin = r.headers.get("access-control-allow-origin", "")
    check(
        "CORS allows localhost:3000",
        "localhost:3000" in cors_origin or cors_origin == "*",
        f"got: {cors_origin}"
    )
except Exception as e:
    check("CORS", False, str(e))

# --- Summary ---
print("\n" + "=" * 60)
total = TESTS_PASSED + TESTS_FAILED
print(f"RESULTS: {TESTS_PASSED}/{total} passed, {TESTS_FAILED} failed")
if TESTS_FAILED == 0:
    print("🚀 ALL TESTS PASSED — PRODUCTION READY!")
else:
    print("⚠️  Some tests failed. Review above output.")
print("=" * 60)
