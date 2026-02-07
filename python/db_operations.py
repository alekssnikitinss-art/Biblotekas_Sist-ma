"""
db_operations.py
Optional helpers to perform CRUD against the Postgres DB created by init_db.py

This file demonstrates how to add/delete/update books and users.
"""
import os
import psycopg2

DB_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/biblioteka')

def connect():
    return psycopg2.connect(DB_URL)

def add_user(username, password, role='user'):
    conn = connect(); cur = conn.cursor()
    cur.execute("INSERT INTO users (username,password,role) VALUES (%s,%s,%s) RETURNING id", (username,password,role))
    uid = cur.fetchone()[0]
    conn.commit(); cur.close(); conn.close();
    return uid

def add_book(title,author,isbn=None,image_bytes=None):
    conn = connect(); cur = conn.cursor()
    cur.execute("INSERT INTO books (title,author,isbn,image) VALUES (%s,%s,%s,%s) RETURNING id", (title,author,isbn,image_bytes))
    bid = cur.fetchone()[0]
    conn.commit(); cur.close(); conn.close();
    return bid

def list_books():
    conn = connect(); cur = conn.cursor(); cur.execute('SELECT id,title,author,isbn,status FROM books'); rows = cur.fetchall(); cur.close(); conn.close(); return rows

def set_status(book_id, status):
    conn = connect(); cur = conn.cursor(); cur.execute('UPDATE books SET status=%s WHERE id=%s', (status, book_id)); conn.commit(); cur.close(); conn.close()

if __name__=='__main__':
    print('Books:')
    for r in list_books(): print(r)
