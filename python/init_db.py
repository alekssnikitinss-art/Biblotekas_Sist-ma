"""
init_db.py
Optional: initializes a PostgreSQL database schema for this library.

Requires: psycopg2 (pip install psycopg2-binary)
Run locally if you have Postgres running and configured.

This script creates tables: users, books, loans
"""
import os
import psycopg2

DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/biblioteka')

schema = """
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
);
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  image BYTEA,
  reserved_by INTEGER REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  borrowed_at TIMESTAMP DEFAULT now(),
  returned_at TIMESTAMP
);
"""

def main():
    print('Connecting to', DB_URL)
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute(schema)
    conn.commit()
    cur.close()
    conn.close()
    print('Schema created (if not existed).')

if __name__=='__main__':
    main()
