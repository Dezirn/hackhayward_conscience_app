from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load secrets from the .env file
load_dotenv()

app = FastAPI(title="Social Energy Backend")

# Security bypass so Next.js can talk to this server locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to Supabase using your keys
try:
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)
    print("✅ Connected to Supabase!")
except Exception as e:
    print(f"❌ Supabase Connection Error: {e}")

# A simple health check route
@app.get("/")
def health_check():
    return {"status": "success", "message": "The Social Energy Backend is alive!"}