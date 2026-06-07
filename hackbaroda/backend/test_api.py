import time
import requests

def test_apis():
    # Wait for backend to be ready
    for i in range(30):
        try:
            r = requests.get("http://localhost:8000/api/health")
            if r.status_code == 200:
                print("Backend is online!")
                break
        except requests.exceptions.ConnectionError:
            pass
        time.sleep(2)
    else:
        print("Backend did not start in time.")
        return

    # Test Ingest
    print("\nTesting /api/ingest...")
    ingest_payload = {
        "source": "reddit",
        "raw_text": "The new update is absolutely amazing! The app runs much faster now, but the font size is a bit too small for me."
    }
    r = requests.post("http://localhost:8000/api/ingest", json=ingest_payload)
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.json()}")

    # Test Trends
    print("\nTesting /api/trends...")
    r = requests.get("http://localhost:8000/api/trends")
    print(f"Status Code: {r.status_code}")
    print(f"Response: {r.json()}")

if __name__ == "__main__":
    test_apis()
