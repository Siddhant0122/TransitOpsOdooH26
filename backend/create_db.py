import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv

# Load environment variables from .env file explicitly using absolute path
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=dotenv_path)

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:XYZ=octa@localhost:5433/transitopsDB")
if not db_url or "sqlite" in db_url:
    print("No PostgreSQL DATABASE_URL found or using SQLite. Skipping database creation.")
    exit(0)

# Parse connection URL to connect to the default 'postgres' database
# Format: postgresql://username:password@host:port/database
try:
    # Split URL to get default connection parameters
    prefix, rest = db_url.split("://")
    credentials, host_port_db = rest.split("@")
    user, password = credentials.split(":")
    host_port, db_name = host_port_db.split("/")
    host, port = host_port.split(":")
except Exception as e:
    print(f"Error parsing DATABASE_URL: {e}")
    print("Please make sure DATABASE_URL is in the format: postgresql://username:password@host:port/database")
    exit(1)

try:
    # Connect to the default 'postgres' database to check/create 'transitops'
    conn = psycopg2.connect(
        dbname="postgres",
        user=user,
        password=password,
        host=host,
        port=port
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if target database exists
    cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{db_name}'")
    exists = cursor.fetchone()
    
    if not exists:
        print(f"Database '{db_name}' does not exist. Creating database...")
        cursor.execute(f"CREATE DATABASE {db_name}")
        print(f"Database '{db_name}' created successfully!")
    else:
        print(f"Database '{db_name}' already exists.")
        
    cursor.close()
    conn.close()
except psycopg2.OperationalError as oe:
    print(f"Connection failed: {oe}")
    print("\n[Action Required] Please check if your PostgreSQL username, password, or port are correct in backend/.env.")
    exit(1)
except Exception as e:
    print(f"An unexpected error occurred: {e}")
    exit(1)
