import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

try:
    models = genai.list_models()
    print([m.name for m in models])
except Exception as e:
    print(f"Error: {e}")
