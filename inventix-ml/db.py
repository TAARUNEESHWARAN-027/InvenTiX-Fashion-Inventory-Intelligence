import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db():
    """Return a new psycopg2 connection. Caller is responsible for closing it."""
    conn = psycopg2.connect(DATABASE_URL)
    return conn
