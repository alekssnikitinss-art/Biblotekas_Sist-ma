"""
Bibliotēka Library Management System - Flask Backend
Uses PostgreSQL for data storage
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
import bcrypt
import secrets
import string
from functools import wraps

app = Flask(__name__)
CORS(app)

# Database configuration from environment variables
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/biblioteka')

def get_db_connection():
    """Get a database connection"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def init_db():
    """Initialize database schema"""
    conn = get_db_connection()
    if not conn:
        print("Could not connect to database")
        return False
    
    cur = conn.cursor()
    
    try:
        # Create users table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Create books table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS books (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                isbn TEXT,
                status TEXT NOT NULL DEFAULT 'available',
                image BYTEA,
                reserved_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Create loans table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS loans (
                id SERIAL PRIMARY KEY,
                book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                borrowed_at TIMESTAMP DEFAULT NOW(),
                returned_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        ''')
        
        # Create admin user if not exists
        hashed_admin = bcrypt.hashpw(b'admin', bcrypt.gensalt()).decode('utf-8')
        cur.execute('''
            INSERT INTO users (username, password, role)
            VALUES (%s, %s, %s)
            ON CONFLICT (username) DO NOTHING
        ''', ('admin', hashed_admin, 'admin'))
        
        conn.commit()
        print("✅ Database schema initialized successfully")
        return True
    except Exception as e:
        print(f"Error initializing database: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        if len(password) < 3:
            return jsonify({'error': 'Password must be at least 3 characters'}), 400
        
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        try:
            cur.execute('''
                INSERT INTO users (username, password, role)
                VALUES (%s, %s, %s)
                RETURNING id, username, role
            ''', (username, hashed_password, 'user'))
            
            user = cur.fetchone()
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': 'User registered successfully',
                'user': {
                    'id': user[0],
                    'username': user[1],
                    'role': user[2]
                }
            }), 201
        except psycopg2.IntegrityError:
            conn.rollback()
            return jsonify({'error': 'Username already exists'}), 400
        finally:
            cur.close()
            conn.close()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute('SELECT id, username, password, role FROM users WHERE username = %s', (username,))
        user = cur.fetchone()
        cur.close()
        conn.close()
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'role': user['role']
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# BOOK ENDPOINTS
# ============================================================================

@app.route('/api/books', methods=['GET'])
def get_books():
    """Get all books with optional search"""
    try:
        search = request.args.get('search', '').strip().lower()
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        if search:
            cur.execute('''
                SELECT id, title, author, isbn, status, image, reserved_by
                FROM books
                WHERE LOWER(title) LIKE %s OR LOWER(author) LIKE %s
                ORDER BY created_at DESC
            ''', (f'%{search}%', f'%{search}%'))
        else:
            cur.execute('''
                SELECT id, title, author, isbn, status, image, reserved_by
                FROM books
                ORDER BY created_at DESC
            ''')
        
        books = cur.fetchall()
        cur.close()
        conn.close()
        
        # Convert image bytes to base64 string
        books_list = []
        for book in books:
            book_data = dict(book)
            if book_data['image']:
                import base64
                book_data['image'] = 'data:image/jpeg;base64,' + base64.b64encode(book_data['image']).decode('utf-8')
            books_list.append(book_data)
        
        return jsonify(books_list), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/books', methods=['POST'])
def create_book():
    """Create a new book"""
    try:
        data = request.json
        title = data.get('title', '').strip()
        author = data.get('author', '').strip()
        isbn = data.get('isbn', '').strip()
        image = data.get('image')  # Base64 string
        
        if not title or not author:
            return jsonify({'error': 'Title and author are required'}), 400
        
        # Convert base64 image to bytes
        image_bytes = None
        if image:
            import base64
            try:
                if image.startswith('data:image'):
                    image_bytes = base64.b64decode(image.split(',')[1])
                else:
                    image_bytes = base64.b64decode(image)
            except Exception as e:
                print(f"Image decode error: {e}")
                image_bytes = None
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('''
            INSERT INTO books (title, author, isbn, status, image)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, title, author, isbn, status
        ''', (title, author, isbn or None, 'available', image_bytes))
        
        book = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'book': {
                'id': book[0],
                'title': book[1],
                'author': book[2],
                'isbn': book[3],
                'status': book[4],
                'image': None,
                'reserved_by': None
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """Update a book"""
    try:
        data = request.json
        title = data.get('title', '').strip()
        author = data.get('author', '').strip()
        isbn = data.get('isbn', '').strip()
        image = data.get('image')
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if book exists
        cur.execute('SELECT id FROM books WHERE id = %s', (book_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Book not found'}), 404
        
        # Handle image update
        image_bytes = None
        if image:
            import base64
            try:
                if image.startswith('data:image'):
                    image_bytes = base64.b64decode(image.split(',')[1])
                else:
                    image_bytes = base64.b64decode(image)
            except:
                image_bytes = None
        
        # Update book
        if image_bytes is not None:
            cur.execute('''
                UPDATE books
                SET title = %s, author = %s, isbn = %s, image = %s
                WHERE id = %s
                RETURNING id, title, author, isbn, status
            ''', (title, author, isbn or None, image_bytes, book_id))
        else:
            cur.execute('''
                UPDATE books
                SET title = %s, author = %s, isbn = %s
                WHERE id = %s
                RETURNING id, title, author, isbn, status
            ''', (title, author, isbn or None, book_id))
        
        book = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'book': {
                'id': book[0],
                'title': book[1],
                'author': book[2],
                'isbn': book[3],
                'status': book[4]
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """Delete a book"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('SELECT id FROM books WHERE id = %s', (book_id,))
        if not cur.fetchone():
            cur.close()
            conn.close()
            return jsonify({'error': 'Book not found'}), 404
        
        cur.execute('DELETE FROM books WHERE id = %s', (book_id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Book deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# BOOK ACTIONS (Reserve, Borrow, Return)
# ============================================================================

@app.route('/api/books/<int:book_id>/reserve', methods=['POST'])
def reserve_book(book_id):
    """Reserve a book"""
    try:
        data = request.json
        username = data.get('username')
        
        if not username:
            return jsonify({'error': 'Username required'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get user ID
        cur.execute('SELECT id FROM users WHERE username = %s', (username,))
        user = cur.fetchone()
        if not user:
            cur.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        user_id = user[0]
        
        # Check book status
        cur.execute('SELECT status FROM books WHERE id = %s', (book_id,))
        book = cur.fetchone()
        if not book:
            cur.close()
            conn.close()
            return jsonify({'error': 'Book not found'}), 404
        
        if book[0] != 'available':
            cur.close()
            conn.close()
            return jsonify({'error': 'Book is not available'}), 400
        
        # Reserve book
        cur.execute('''
            UPDATE books
            SET status = %s, reserved_by = %s
            WHERE id = %s
            RETURNING id, status
        ''', ('reserved', user_id, book_id))
        
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Book reserved'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/books/<int:book_id>/borrow', methods=['POST'])
def borrow_book(book_id):
    """Borrow a book"""
    try:
        data = request.json
        username = data.get('username')
        
        if not username:
            return jsonify({'error': 'Username required'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get user ID
        cur.execute('SELECT id FROM users WHERE username = %s', (username,))
        user = cur.fetchone()
        if not user:
            cur.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        user_id = user[0]
        
        # Check book status
        cur.execute('SELECT status, reserved_by FROM books WHERE id = %s', (book_id,))
        book = cur.fetchone()
        if not book:
            cur.close()
            conn.close()
            return jsonify({'error': 'Book not found'}), 404
        
        status, reserved_by = book
        if status == 'available' or (status == 'reserved' and reserved_by == user_id):
            cur.execute('''
                UPDATE books
                SET status = %s, reserved_by = %s
                WHERE id = %s
            ''', ('borrowed', user_id, book_id))
            
            # Create loan record
            cur.execute('''
                INSERT INTO loans (book_id, user_id)
                VALUES (%s, %s)
            ''', (book_id, user_id))
            
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({'success': True, 'message': 'Book borrowed'}), 200
        else:
            cur.close()
            conn.close()
            return jsonify({'error': 'Cannot borrow this book'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/books/<int:book_id>/return', methods=['POST'])
def return_book(book_id):
    """Return a book"""
    try:
        data = request.json
        username = data.get('username')
        
        if not username:
            return jsonify({'error': 'Username required'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get user ID
        cur.execute('SELECT id FROM users WHERE username = %s', (username,))
        user = cur.fetchone()
        if not user:
            cur.close()
            conn.close()
            return jsonify({'error': 'User not found'}), 404
        user_id = user[0]
        
        # Check book
        cur.execute('SELECT status, reserved_by FROM books WHERE id = %s', (book_id,))
        book = cur.fetchone()
        if not book:
            cur.close()
            conn.close()
            return jsonify({'error': 'Book not found'}), 404
        
        status, reserved_by = book
        if status == 'borrowed' and reserved_by == user_id:
            cur.execute('''
                UPDATE books
                SET status = %s, reserved_by = NULL
                WHERE id = %s
            ''', ('available', book_id))
            
            # Update loan record
            cur.execute('''
                UPDATE loans
                SET returned_at = NOW()
                WHERE book_id = %s AND user_id = %s AND returned_at IS NULL
            ''', (book_id, user_id))
            
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({'success': True, 'message': 'Book returned'}), 200
        else:
            cur.close()
            conn.close()
            return jsonify({'error': 'Cannot return this book'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    conn = get_db_connection()
    if conn:
        conn.close()
        return jsonify({'status': 'healthy', 'database': 'connected'}), 200
    else:
        return jsonify({'status': 'unhealthy', 'database': 'disconnected'}), 500

# ============================================================================
# STARTUP
# ============================================================================

if __name__ == '__main__':
    # Initialize database on startup
    init_db()
    
    # Run Flask app
    port = int(os.getenv('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)