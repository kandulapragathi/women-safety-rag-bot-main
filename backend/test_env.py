import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")

if api_key:
    print("Gemini API key found successfully!")
else:
    print("Gemini API key not found.")