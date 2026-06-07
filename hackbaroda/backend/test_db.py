import os
import pg8000.native
from dotenv import load_dotenv

load_dotenv()

# Extract project ID from URL
url = os.getenv("SUPABASE_URL", "")
project_ref = url.split("://")[1].split(".")[0] if "://" in url else ""
password = os.getenv("SUPABASE_DB_PASSWORD", "")

try:
    con = pg8000.native.Connection(
        user="postgres",
        password=password,
        host=f"aws-0-ap-south-1.pooler.supabase.com", # Try to connect via pooler or db.pntqjvqdlqqrqoxyulkc.supabase.co
        # We don't know the region. Let's use the direct db link: db.pntqjvqdlqqrqoxyulkc.supabase.co
    )
    print("Connected via pooler!")
except Exception as e:
    print(f"Pooler failed: {e}")

try:
    con = pg8000.native.Connection(
        user="postgres",
        password=password,
        host=f"db.{project_ref}.supabase.co",
        database="postgres",
        port=5432
    )
    print("Connected directly!")
    
    with open("../supabase_schema.sql", "r") as f:
        sql = f.read()
    
    # Run the schema
    for statement in sql.split(";"):
        if statement.strip():
            con.run(statement)
    print("Schema created successfully!")
    
except Exception as e:
    print(f"Direct connection failed: {e}")
