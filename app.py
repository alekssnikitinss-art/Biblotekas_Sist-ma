"""
Bibliotēkas Vadības Sistēma - Backend (Python Flask + SQLite)

Šis skripts izveido pilnīgu bibliotēkas vadības sistēmu ar:
- SQLite datubāzi grāmatu, lietotāju un aizdevumu glabāšanai
- REST API galvenajiem darbībām
- Datu validāciju un kļūdu apstrādi
- Datu persistenci starp sesijām
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime, timedelta
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Admin token used to protect write endpoints in production (set on Render as an env var)
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN')

# Datubāzes konfigurācija
DATABASE_PATH = str(Path(__file__).parent / 'biblioteka.db')

def get_db_connection():
    """Savienojas ar SQLite datubāzi"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializē datubāzi ar tabulām"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Grāmatu tabula
    c.execute('''CREATE TABLE IF NOT EXISTS grāmata (
        isbn VARCHAR(20) PRIMARY KEY,
        nosaukums VARCHAR(255) NOT NULL,
        autors VARCHAR(255) NOT NULL,
        izdošanas_gads INTEGER,
        žanrs VARCHAR(100),
        kopiju_skaits INTEGER NOT NULL DEFAULT 0,
        pieejamās_kopijas INTEGER NOT NULL DEFAULT 0,
        pievienošanas_datums DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Lietotāju tabula
    c.execute('''CREATE TABLE IF NOT EXISTS lietotājs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vārds VARCHAR(100) NOT NULL,
        uzvārds VARCHAR(100) NOT NULL,
        e_pasts VARCHAR(255) UNIQUE NOT NULL,
        telefons VARCHAR(20),
        reģistrācijas_datums DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Aizdevumu tabula
    c.execute('''CREATE TABLE IF NOT EXISTS aizdevums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        isbn VARCHAR(20) NOT NULL,
        lietotāja_id INTEGER NOT NULL,
        aizdevuma_datums DATETIME DEFAULT CURRENT_TIMESTAMP,
        paredzamais_atgriešanas_datums DATE NOT NULL,
        faktiskais_atgriešanas_datums DATE,
        statuss TEXT DEFAULT 'aktīvs',
        FOREIGN KEY (isbn) REFERENCES grāmata(isbn),
        FOREIGN KEY (lietotāja_id) REFERENCES lietotājs(id)
    )''')
    
    # Indeksi meklēšanai
    c.execute('''CREATE INDEX IF NOT EXISTS idx_grāmata_nosaukums 
                 ON grāmata(nosaukums)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_grāmata_autors 
                 ON grāmata(autors)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_grāmata_žanrs 
                 ON grāmata(žanrs)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_aizdevums_lietotāja_id 
                 ON aizdevums(lietotāja_id)''')
    c.execute('''CREATE INDEX IF NOT EXISTS idx_aizdevums_statuss 
                 ON aizdevums(statuss)''')
    
    conn.commit()
    conn.close()


# Ensure the database and sample data exist when the module is imported.
# This helps WSGI servers (gunicorn) on platforms like render.com where
# they import the module instead of running it as __main__.
MARKER_FILE = str(Path(__file__).parent / 'dati_jau_pievienoti.txt')

def ensure_db_and_seed():
    # Initialize DB if missing
    if not Path(DATABASE_PATH).exists():
        init_db()

    # If marker file doesn't exist, seed sample data (idempotent using INSERT OR IGNORE)
    if not Path(MARKER_FILE).exists():
        conn = get_db_connection()
        c = conn.cursor()
        paraugu_grāmatas = [
            ('978-9934-0-00001', 'Meža diena', 'Imants Ziedonis', 1991, 'Dzeja', 3),
            ('978-9934-0-00002', 'Putnu pēdas smiltīs', 'Ināra Čaklā', 1995, 'Romans', 2),
            ('978-9934-0-00003', 'Balto nakšu vīrs', 'Sergejs Timofejevs', 1994, 'Romans', 2),
            ('978-9934-0-00004', 'Mājas svečtur dega', 'Zoja Anete Blūmfelde', 2001, 'Detektīvs', 1),
            ('978-9934-0-00005', '1984', 'George Orwell', 1949, 'Zinātniskā fantastika', 3),
        ]
        for isbn, nosaukums, autors, gads, žanrs, kopijas in paraugu_grāmatas:
            c.execute('''
                INSERT OR IGNORE INTO grāmata (isbn, nosaukums, autors, izdošanas_gads, žanrs, kopiju_skaits, pieejamās_kopijas)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (isbn, nosaukums, autors, gads, žanrs, kopijas, kopijas))

        paraugu_lietotāji = [
            ('Jānis', 'Bērziņš', 'janis@example.com', '+371-20001111'),
            ('Ināra', 'Gaile', 'inara@example.com', '+371-20002222'),
            ('Andrejs', 'Soms', 'andrejs@example.com', '+371-20003333'),
        ]
        for vārds, uzvārds, e_pasts, telefons in paraugu_lietotāji:
            c.execute('''
                INSERT OR IGNORE INTO lietotājs (vārds, uzvārds, e_pasts, telefons)
                VALUES (?, ?, ?, ?)
            ''', (vārds, uzvārds, e_pasts, telefons))

        conn.commit()
        conn.close()

        # Create marker file so seeding doesn't run again
        with open(MARKER_FILE, 'w', encoding='utf-8') as f:
            f.write('Dati pievienoti')


# Run DB init & seed at import time so WSGI servers (gunicorn) have DB ready
ensure_db_and_seed()
# ============= GRĀMATU VADĪBA =============

@app.route('/api/grāmatas', methods=['GET'])
def get_grāmatas():
    """Iegūst visas grāmatas"""
    conn = get_db_connection()
    grāmatas = conn.execute('SELECT * FROM grāmata ORDER BY nosaukums').fetchall()
    conn.close()
    return jsonify([dict(g) for g in grāmatas])

@app.route('/api/grāmatas/meklēt', methods=['GET'])
def meklēt_grāmatu():
    """Meklē grāmatu pēc nosaukuma, autora vai ISBN"""
    meklēšanas_teksts = request.args.get('q', '').lower()
    žanrs_filtrs = request.args.get('žanrs', '')
    
    conn = get_db_connection()
    query = 'SELECT * FROM grāmata WHERE 1=1'
    params = []
    
    if meklēšanas_teksts:
        query += ' AND (LOWER(nosaukums) LIKE ? OR LOWER(autors) LIKE ? OR isbn LIKE ?)'
        params.extend([f'%{meklēšanas_teksts}%', f'%{meklēšanas_teksts}%', f'%{meklēšanas_teksts}%'])
    
    if žanrs_filtrs:
        query += ' AND LOWER(žanrs) = ?'
        params.append(žanrs_filtrs.lower())
    
    query += ' ORDER BY nosaukums'
    
    grāmatas = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(g) for g in grāmatas])

# --- Config endpoint for frontend to know if admin token is required ---
@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({'admin_required': bool(ADMIN_TOKEN)})

@app.route('/api/grāmatas', methods=['POST'])
def pievienot_grāmatu():
    """Pievieno jaunu grāmatu katalogā"""
    # Allow writes when ADMIN_TOKEN is not set (dev). When ADMIN_TOKEN is set, require header X-Admin-Token.
    if ADMIN_TOKEN:
        token = request.headers.get('X-Admin-Token')
        if token != ADMIN_TOKEN:
            return jsonify({'kļūda': 'Unauthorized'}), 401

    dati = request.get_json()
    
    # Validācija
    if not dati.get('isbn') or not dati.get('nosaukums') or not dati.get('autors'):
        return jsonify({'kļūda': 'ISBN, nosaukums un autors ir obligāti'}), 400
    
    try:
        kopiju_skaits = int(dati.get('kopiju_skaits', 1))
        if kopiju_skaits < 0:
            return jsonify({'kļūda': 'Kopiju skaits nevar būt negatīvs'}), 400
    except ValueError:
        return jsonify({'kļūda': 'Kopiju skaits jābūt skaitlim'}), 400
    
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO grāmata (isbn, nosaukums, autors, izdošanas_gads, žanrs, kopiju_skaits, pieejamās_kopijas)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            dati['isbn'],
            dati['nosaukums'],
            dati['autors'],
            dati.get('izdošanas_gads'),
            dati.get('žanrs'),
            kopiju_skaits,
            kopiju_skaits
        ))
        conn.commit()
        conn.close()
        return jsonify({'ziņa': 'Grāmata pievienota'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'kļūda': 'Grāmata ar šādu ISBN jau pastāv'}), 400

@app.route('/api/grāmatas/<isbn>', methods=['PUT'])
def atjaunināt_grāmatu(isbn):
    """Atjaunina grāmatas informāciju"""
    if ADMIN_TOKEN:
        token = request.headers.get('X-Admin-Token')
        if token != ADMIN_TOKEN:
            return jsonify({'kļūda': 'Unauthorized'}), 401

    dati = request.get_json()
    conn = get_db_connection()
    
    conn.execute('''
        UPDATE grāmata 
        SET nosaukums = ?, autors = ?, izdošanas_gads = ?, žanrs = ?
        WHERE isbn = ?
    ''', (
        dati.get('nosaukums'),
        dati.get('autors'),
        dati.get('izdošanas_gads'),
        dati.get('žanrs'),
        isbn
    ))
    conn.commit()
    conn.close()
    return jsonify({'ziņa': 'Grāmata atjaunināta'})

@app.route('/api/grāmatas/<isbn>', methods=['DELETE'])
def dzēst_grāmatu(isbn):
    """Dzēš grāmatu no kataloga"""
    if ADMIN_TOKEN:
        token = request.headers.get('X-Admin-Token')
        if token != ADMIN_TOKEN:
            return jsonify({'kļūda': 'Unauthorized'}), 401

    conn = get_db_connection()
    
    # Pārbauda, vai grāmata nav aizņemta
    aktīvie_aizdevumi = conn.execute(
        'SELECT COUNT(*) as skaits FROM aizdevums WHERE isbn = ? AND statuss = ?',
        (isbn, 'aktīvs')
    ).fetchone()
    
    if aktīvie_aizdevumi['skaits'] > 0:
        conn.close()
        return jsonify({'kļūda': 'Nevar dzēst grāmatu, kas ir aizņemta'}), 400
    
    conn.execute('DELETE FROM aizdevums WHERE isbn = ?', (isbn,))
    conn.execute('DELETE FROM grāmata WHERE isbn = ?', (isbn,))
    conn.commit()
    conn.close()
    return jsonify({'ziņa': 'Grāmata dzēsta'})

@app.route('/api/grāmatas/žanri', methods=['GET'])
def get_žanri():
    """Iegūst visus pieejamos žanrus"""
    conn = get_db_connection()
    žanri = conn.execute('SELECT DISTINCT žanrs FROM grāmata WHERE žanrs IS NOT NULL ORDER BY žanrs').fetchall()
    conn.close()
    return jsonify([dict(ž)['žanrs'] for ž in žanri])

# ============= LIETOTĀJU VADĪBA =============

@app.route('/api/lietotāji', methods=['GET'])
def get_lietotāji():
    """Iegūst visus lietotājus"""
    conn = get_db_connection()
    lietotāji = conn.execute('SELECT * FROM lietotājs ORDER BY uzvārds, vārds').fetchall()
    conn.close()
    return jsonify([dict(l) for l in lietotāji])

@app.route('/api/lietotāji', methods=['POST'])
def pievienot_lietotāju():
    """Reģistrē jaunu lietotāju"""
    if ADMIN_TOKEN:
        token = request.headers.get('X-Admin-Token')
        if token != ADMIN_TOKEN:
            return jsonify({'kļūda': 'Unauthorized'}), 401

    dati = request.get_json()
    
    # Validācija
    if not dati.get('vārds') or not dati.get('uzvārds') or not dati.get('e_pasts'):
        return jsonify({'kļūda': 'Vārds, uzvārds un e-pasts ir obligāti'}), 400
    
    # Vienkārša e-pasta validācija
    if '@' not in dati['e_pasts']:
        return jsonify({'kļūda': 'Nepareizt e-pasta formāts'}), 400
    
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO lietotājs (vārds, uzvārds, e_pasts, telefons)
            VALUES (?, ?, ?, ?)
        ''', (
            dati['vārds'],
            dati['uzvārds'],
            dati['e_pasts'],
            dati.get('telefons', '')
        ))
        conn.commit()
        lietotājs_id = conn.lastrowid
        conn.close()
        return jsonify({'ziņa': 'Lietotājs reģistrēts', 'id': lietotājs_id}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'kļūda': 'Lietotājs ar šādu e-pastu jau pastāv'}), 400

@app.route('/api/lietotāji/<int:id>', methods=['DELETE'])
def dzēst_lietotāju(id):
    """Dzēš lietotāju"""
    if ADMIN_TOKEN:
        token = request.headers.get('X-Admin-Token')
        if token != ADMIN_TOKEN:
            return jsonify({'kļūda': 'Unauthorized'}), 401

    conn = get_db_connection()
    
    # Pārbauda, vai lietotājam ir aktīvi aizdevumi
    aktīvie_aizdevumi = conn.execute(
        'SELECT COUNT(*) as skaits FROM aizdevums WHERE lietotāja_id = ? AND statuss = ?',
        (id, 'aktīvs')
    ).fetchone()
    
    if aktīvie_aizdevumi['skaits'] > 0:
        conn.close()
        return jsonify({'kļūda': 'Nevar dzēst lietotāju ar aktīviem aizdevumiem'}), 400
    
    conn.execute('DELETE FROM lietotājs WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'ziņa': 'Lietotājs dzēsts'})

# ============= AIZDEVUMU VADĪBA =============

@app.route('/api/aizdevumi', methods=['GET'])
def get_aizdevumi():
    """Iegūst visus aizdevumus"""
    statuss = request.args.get('statuss', 'visi')
    
    conn = get_db_connection()
    if statuss == 'aktīvs':
        aizdevumi = conn.execute('''
            SELECT a.*, g.nosaukums, g.autors, l.vārds, l.uzvārds, l.e_pasts
            FROM aizdevums a
            JOIN grāmata g ON a.isbn = g.isbn
            JOIN lietotājs l ON a.lietotāja_id = l.id
            WHERE a.statuss = 'aktīvs'
            ORDER BY a.paredzamais_atgriešanas_datums
        ''').fetchall()
    elif statuss == 'atgriezts':
        aizdevumi = conn.execute('''
            SELECT a.*, g.nosaukums, g.autors, l.vārds, l.uzvārds, l.e_pasts
            FROM aizdevums a
            JOIN grāmata g ON a.isbn = g.isbn
            JOIN lietotājs l ON a.lietotāja_id = l.id
            WHERE a.statuss = 'atgriezts'
            ORDER BY a.faktiskais_atgriešanas_datums DESC
        ''').fetchall()
    else:
        aizdevumi = conn.execute('''
            SELECT a.*, g.nosaukums, g.autors, l.vārds, l.uzvārds, l.e_pasts
            FROM aizdevums a
            JOIN grāmata g ON a.isbn = g.isbn
            JOIN lietotājs l ON a.lietotāja_id = l.id
            ORDER BY a.aizdevuma_datums DESC
        ''').fetchall()
    
    conn.close()
    return jsonify([dict(a) for a in aizdevumi])

@app.route('/api/aizdevumi', methods=['POST'])
def pievienot_aizdevumu():
    """Reģistrē grāmatas aizdevumu"""
    if ADMIN_TOKEN:
        token = request.headers.get('X-Admin-Token')
        if token != ADMIN_TOKEN:
            return jsonify({'kļūda': 'Unauthorized'}), 401

    dati = request.get_json()
    
    if not dati.get('isbn') or not dati.get('lietotāja_id'):
        return jsonify({'kļūda': 'ISBN un lietotāja ID ir obligāti'}), 400
    
    conn = get_db_connection()
    
    # Pārbauda, vai grāmata pastāv un vai ir pieejama
    grāmata = conn.execute('SELECT * FROM grāmata WHERE isbn = ?', (dati['isbn'],)).fetchone()
    if not grāmata:
        conn.close()
        return jsonify({'kļūda': 'Grāmata nav atrasta'}), 404
    
    if grāmata['pieejamās_kopijas'] <= 0:
        conn.close()
        return jsonify({'kļūda': 'Grāmata nav pieejama'}), 400
    
    # Pārbauda, vai lietotājs pastāv
    lietotājs = conn.execute('SELECT * FROM lietotājs WHERE id = ?', (dati['lietotāja_id'],)).fetchone()
    if not lietotājs:
        conn.close()
        return jsonify({'kļūda': 'Lietotājs nav atrasts'}), 404
    
    # Aprēķina termiņu (30 dienas)
    aizdevuma_datums = datetime.now()
    atgriešanas_datums = aizdevuma_datums + timedelta(days=30)
    
    # Pievieno aizdevumu
    conn.execute('''
        INSERT INTO aizdevums (isbn, lietotāja_id, aizdevuma_datums, paredzamais_atgriešanas_datums, statuss)
        VALUES (?, ?, ?, ?, 'aktīvs')
    ''', (
        dati['isbn'],
        dati['lietotāja_id'],
        aizdevuma_datums.strftime('%Y-%m-%d %H:%M:%S'),
        atgriešanas_datums.strftime('%Y-%m-%d')
    ))
    
    # Samazina pieejamo kopiju skaitu
    conn.execute(
        'UPDATE grāmata SET pieejamās_kopijas = pieejamās_kopijas - 1 WHERE isbn = ?',
        (dati['isbn'],)
    )
    
    conn.commit()
    conn.close()
    return jsonify({'ziņa': 'Aizdevums reģistrēts'}), 201

@app.route('/api/aizdevumi/<int:id>/atgriezt', methods=['POST'])
def atgriezt_aizdevumu(id):
    """Reģistrē grāmatas atgriešanu"""
    if ADMIN_TOKEN:
        token = request.headers.get('X-Admin-Token')
        if token != ADMIN_TOKEN:
            return jsonify({'kļūda': 'Unauthorized'}), 401

    conn = get_db_connection()
    
    # Atrod aizdevumu
    aizdevums = conn.execute('SELECT * FROM aizdevums WHERE id = ?', (id,)).fetchone()
    if not aizdevums:
        conn.close()
        return jsonify({'kļūda': 'Aizdevums nav atrasts'}), 404
    
    if aizdevums['statuss'] == 'atgriezts':
        conn.close()
        return jsonify({'kļūda': 'Aizdevums jau ir atgriezts'}), 400
    
    # Atjaunina aizdevumu
    faktiskais_datums = datetime.now().strftime('%Y-%m-%d')
    conn.execute(
        'UPDATE aizdevums SET statuss = ?, faktiskais_atgriešanas_datums = ? WHERE id = ?',
        ('atgriezts', faktiskais_datums, id)
    )
    
    # Pievieno pieejamo kopiju skaitu
    conn.execute(
        'UPDATE grāmata SET pieejamās_kopijas = pieejamās_kopijas + 1 WHERE isbn = ?',
        (aizdevums['isbn'],)
    )
    
    conn.commit()
    conn.close()
    return jsonify({'ziņa': 'Grāmata atgriezta'})

# ============= STATISTIKA =============

@app.route('/api/statistika', methods=['GET'])
def get_statistika():
    """Iegūst sistēmas statistiku"""
    conn = get_db_connection()
    
    stats = {
        'grāmatu_skaits': conn.execute('SELECT COUNT(*) as skaits FROM grāmata').fetchone()['skaits'],
        'lietotāju_skaits': conn.execute('SELECT COUNT(*) as skaits FROM lietotājs').fetchone()['skaits'],
        'aktīvie_aizdevumi': conn.execute('SELECT COUNT(*) as skaits FROM aizdevums WHERE statuss = ?', ('aktīvs',)).fetchone()['skaits'],
        'kopējie_aizdevumi': conn.execute('SELECT COUNT(*) as skaits FROM aizdevums').fetchone()['skaits'],
    }
    
    # Populārākās grāmatas
    populārākās = conn.execute('''
        SELECT g.nosaukums, g.autors, COUNT(a.id) as aizdevumu_skaits
        FROM grāmata g
        LEFT JOIN aizdevums a ON g.isbn = a.isbn
        GROUP BY g.isbn
        ORDER BY aizdevumu_skaits DESC
        LIMIT 5
    ''').fetchall()
    
    stats['populārākās_grāmatas'] = [dict(g) for g in populārākās]
    
    # Nokavētie aizdevumi
    šodien = datetime.now().strftime('%Y-%m-%d')
    nokavētie = conn.execute('''
        SELECT COUNT(*) as skaits FROM aizdevums
        WHERE statuss = 'aktīvs' AND paredzamais_atgriešanas_datums < ?
    ''', (šodien,)).fetchone()
    
    stats['nokavētie_aizdevumi'] = nokavētie['skaits']
    
    conn.close()
    return jsonify(stats)

# ============= STATISKĀ SATURA SERVĒŠANA =============

@app.route('/')
def index():
    """Servē HTML interfeisu"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Servē statiskos failus"""
    return send_from_directory('.', path)

if __name__ == '__main__':
    # Inicializē datubāzi
    init_db()
    
    # Pievieno paraugu datus
    if not os.path.exists('dati_jau_pievienoti.txt'):
        conn = get_db_connection()
        c = conn.cursor()
        
        # Paraugu grāmatas
        paraugu_grāmatas = [
            ('978-9934-0-00001', 'Meža diena', 'Imants Ziedonis', 1991, 'Dzeja', 3),
            ('978-9934-0-00002', 'Putnu pēdas smiltīs', 'Ināra Čaklā', 1995, 'Romans', 2),
            ('978-9934-0-00003', 'Balto nakšu vīrs', 'Sergejs Timofejevs', 1994, 'Romans', 2),
            ('978-9934-0-00004', 'Mājas svečtur dega', 'Zoja Anete Blūmfelde', 2001, 'Detektīvs', 1),
            ('978-9934-0-00005', '1984', 'George Orwell', 1949, 'Zinātniskā fantastika', 3),
        ]
        
        for isbn, nosaukums, autors, gads, žanrs, kopijas in paraugu_grāmatas:
            c.execute('''
                INSERT OR IGNORE INTO grāmata (isbn, nosaukums, autors, izdošanas_gads, žanrs, kopiju_skaits, pieejamās_kopijas)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (isbn, nosaukums, autors, gads, žanrs, kopijas, kopijas))
        
        # Paraugu lietotāji
        paraugu_lietotāji = [
            ('Jānis', 'Bērziņš', 'janis@example.com', '+371-20001111'),
            ('Ināra', 'Gaile', 'inara@example.com', '+371-20002222'),
            ('Andrejs', 'Soms', 'andrejs@example.com', '+371-20003333'),
        ]
        
        for vārds, uzvārds, e_pasts, telefons in paraugu_lietotāji:
            c.execute('''
                INSERT OR IGNORE INTO lietotājs (vārds, uzvārds, e_pasts, telefons)
                VALUES (?, ?, ?, ?)
            ''', (vārds, uzvārds, e_pasts, telefons))
        
        conn.commit()
        conn.close()
        
        # Izveido marķieri, lai zinātu, ka dati jau pievienoti
        with open('dati_jau_pievienoti.txt', 'w') as f:
            f.write('Dati pievienoti')
    
    # Host and port can be overridden with environment variables HOST and PORT
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Bibliotēkas API on http://{host}:{port} (Ctrl+C to stop)")
    # threaded=True helps with concurrent browser requests during development
    app.run(host=host, port=port, debug=True, threaded=True)
