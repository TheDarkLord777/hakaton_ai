from sqlalchemy import text
from app.db.base import engine

def run_migration():
    """Add purpose column to clients table"""
    with engine.connect() as connection:
        try:
            # Check if column exists
            connection.execute(text("SELECT purpose FROM clients LIMIT 1"))
            print("purpose column already exists")
        except:
            # Add column
            connection.execute(text("ALTER TABLE clients ADD COLUMN purpose VARCHAR"))
            connection.commit()
            print("Added purpose column to clients table")

if __name__ == "__main__":
    run_migration() 