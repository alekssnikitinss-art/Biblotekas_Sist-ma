# Datu Glabāšanas Sistēmas Dokumentācija

## 1. GLABĀŠANAS SISTĒMAS IZVĒLE

### 1.1 Salīdzinājums starp Opcijām

#### Opcija 1: Teksta Fails (CSV/JSON)
**Priekšrocības:**
- Vienkāršs ieviešanu
- Brīvs no serveriem
- Viegli lasāms un pārrediģējams

**Trūkumi:**
- Lēna meklēšana
- Nav konkrētības kontroles
- Grūti pārvaldīt relācijas
- Nav drošības līmeņu
- Ierobežota mērogojamība

#### Opcija 2: SQL Datubāze (SQLite)
**Priekšrocības:**
- Ātra meklēšana ar indeksiem
- Relāciski dati un ārējās atslēgas
- ACID garantijas (datu integritāte)
- Bezsaistības drošība
- Mērogojama maziem-vidējiem uzņēmumiem
- Pieejama datorā (nav servera nepieciešams)

**Trūkumi:**
- Ir nepieciešams SQL zināšanas
- Nav tīkla piekļuves (lokāli)

#### Opcija 3: NoSQL Datubāze (MongoDB)
**Priekšrocības:**
- Elastīga shēma
- Ātra rakstīšana
- Labi mērogojama lielu datu apjomiem
- Tīkla pieejamība

**Trūkumi:**
- Mazāka duomenu integritāte
- Dārgāka infrastruktūra
- Nepiemērota mazām sistēmām

### 1.2 Mūsu Izvēle: SQLite

Šai nelielai bibliotēkai **SQLite** ir ideāls izvēle, jo:
1. Dati ir **reljatīvi** (grāmata, lietotājs, aizdevums) → jāsargā integrām
2. Prasības pēc **ātrās meklēšanas** (ISBN, autors)
3. Sistēma ir **lokāla** (SQLite nepieciešams serveris)
4. Vienkāršas **CRUD operācijas** (Create, Read, Update, Delete)
5. **Pieejamības kontrole** starp tabulu

---

## 2. DATU PERSISTENCES IEVIEŠANA

### 2.1 Datubāzes Inicializācija

Programmas sākumā automātiski tiek izveidotas tabulas:

```python
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
    
    # Līdzīgi lietotāju un aizdevumu tabulām
    # ...
    
    conn.commit()
    conn.close()
```

**Procesa::**
1. Savienojas ar datubāzi `biblioteka.db`
2. Izveido tabulas, ja tās vēl nepastāv
3. Pievieno indeksus ātrajai meklēšanai
4. Izsauc `init_db()` programmas sāknumā

### 2.2 Datu Ielāde no Datubāzes

Visas datu ielādes izmanto SQL dotājumus:

```python
# Vienkārša ielāde
def get_grāmatas():
    conn = get_db_connection()
    grāmatas = conn.execute('SELECT * FROM grāmata').fetchall()
    conn.close()
    return grāmatas

# Meklējušī ielāde
def meklēt_grāmatu(meklēšanas_teksts, žanrs):
    conn = get_db_connection()
    query = 'SELECT * FROM grāmata WHERE 1=1'
    params = []
    
    if meklēšanas_teksts:
        query += ' AND (LOWER(nosaukums) LIKE ? OR LOWER(autors) LIKE ?)'
        params.extend([f'%{meklēšanas_teksts}%', f'%{meklēšanas_teksts}%'])
    
    if žanrs:
        query += ' AND LOWER(žanrs) = ?'
        params.append(žanrs.lower())
    
    grāmatas = conn.execute(query, params).fetchall()
    conn.close()
    return grāmatas
```

### 2.3 Datu Saglabāšana Datubāzē

Dati tiek saglabāti INSERT un UPDATE dotājumu ar validāciju:

```python
def pievienot_grāmatu():
    dati = request.get_json()
    
    # VALIDĀCIJA
    if not dati.get('isbn'):
        return jsonify({'kļūda': 'ISBN ir obligāts'}), 400
    
    # SAGLABĀŠANA
    conn = get_db_connection()
    try:
        conn.execute('''
            INSERT INTO grāmata (isbn, nosaukums, autors, kopiju_skaits, pieejamās_kopijas)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            dati['isbn'],
            dati['nosaukums'],
            dati['autors'],
            dati['kopiju_skaits'],
            dati['kopiju_skaits']
        ))
        conn.commit()
        conn.close()
        return jsonify({'ziņa': 'Grāmata pievienota'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'kļūda': 'ISBN jau pastāv'}), 400
```

**Procesa:**
1. Validē ieejošos datus
2. Savienojas ar datubāzi
3. Izpilda INSERT ar parametrizētiem dotājumiem
4. Apstiprina transakciju (`commit()`)
5. Aizver savienojumu
6. Atgriež atbilstošu atbildi

### 2.4 Datu Dzēšana

Dzēšanā pārbauda attiecības pirms dzēšanas:

```python
def dzēst_grāmatu(isbn):
    conn = get_db_connection()
    
    # Pārbauda, vai grāmata nav aizņemta
    aktīvie_aizdevumi = conn.execute(
        'SELECT COUNT(*) as skaits FROM aizdevums WHERE isbn = ? AND statuss = ?',
        (isbn, 'aktīvs')
    ).fetchone()
    
    if aktīvie_aizdevumi['skaits'] > 0:
        conn.close()
        return jsonify({'kļūda': 'Nevar dzēst aizņemtu grāmatu'}), 400
    
    # Drošas dzēšana
    conn.execute('DELETE FROM aizdevums WHERE isbn = ?', (isbn,))
    conn.execute('DELETE FROM grāmata WHERE isbn = ?', (isbn,))
    conn.commit()
    conn.close()
    return jsonify({'ziņa': 'Grāmata dzēsta'})
```

**Drošības pārbaudļi:**
1. Pārbauda, vai nav aktīvo aizdevumu
2. Vispirms dzēš aizdevumus (ārējās atslēgas)
3. Tad dzēš grāmatu
4. Apstiprina transakciju

---

## 3. DATU INTEGRITĀTE UN DROŠĪBA

### 3.1 Primārās un Ārējās Atslēgas

```sql
-- Grāmata: ISBN ir primāra atslēga
CREATE TABLE grāmata (
    isbn VARCHAR(20) PRIMARY KEY,  -- Unikāls identifikators
    ...
)

-- Aizdevums: sakņots uz grāmatām un lietotājiem
CREATE TABLE aizdevums (
    id INTEGER PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL,
    lietotāja_id INTEGER NOT NULL,
    FOREIGN KEY (isbn) REFERENCES grāmata(isbn),
    FOREIGN KEY (lietotāja_id) REFERENCES lietotājs(id) ON DELETE CASCADE
)
```

**Ietekme:**
- Neiespējams aizņemties grāmatu ar ne-eksistējošu ISBN
- Ja lietotājs tiek dzēsts, arī viņa aizdevumi tiek dzēsti
- Dati paliek *koherentni*

### 3.2 Ierobežojumi un Validācija

```python
# Ierobežojums: kopijas nedrīkst būt negatīvas
if grāmata['pieejamās_kopijas'] <= 0:
    return jsonify({'kļūda': 'Grāmata nav pieejama'}), 400

# Ierobežojums: termiņš > aizdevuma datums
if atgriešanas_datums <= aizdevuma_datums:
    return jsonify({'kļūda': 'Nepareizt datums'}), 400

# Validācija: e-pasts
if '@' not in e_pasts:
    return jsonify({'kļūda': 'Nepareizt e-pasta formāts'}), 400
```

### 3.3 Transakcijas (Atomāras Operācijas)

Aizdevuma reģistrācija ir **atomāra** (vai tiek paveikta veseli, vai vispār):

```python
conn.execute('INSERT INTO aizdevums (...) VALUES (...)')
conn.execute('UPDATE grāmata SET pieejamās_kopijas = pieejamās_kopijas - 1 WHERE isbn = ?')
conn.commit()  # Abi SQL pievieno kopā vai nemaz
```

---

## 4. VEIKTSPĒJAS OPTIMIZĀCIJA

### 4.1 Indeksi

```sql
-- Indeksi ātrajai meklēšanai
CREATE INDEX idx_grāmata_nosaukums ON grāmata(nosaukums);
CREATE INDEX idx_grāmata_autors ON grāmata(autors);
CREATE INDEX idx_grāmata_žanrs ON grāmata(žanrs);
CREATE INDEX idx_aizdevums_lietotāja_id ON aizdevums(lietotāja_id);
CREATE INDEX idx_aizdevums_statuss ON aizdevums(statuss);
```

**Veiktspēja:**
- Bez indeksa: O(n) - jāpārbauda visas rindas
- Ar indeksu: O(log n) - bināra meklēšana

### 4.2 Meklēšanas Optimizācija

```python
# Parametrizēti dotājumi (izvairās SQL injekcijas)
query = 'SELECT * FROM grāmata WHERE LOWER(nosaukums) LIKE ?'
params = [f'%{search_text}%']
conn.execute(query, params)
```

---

## 5. DATU DROŠĪBU STARP SESIJĀM

### 5.1 Persistences Plūsma

```
┌─────────────────────┐
│   Lietotājs         │
│   (Web Interfeiss)  │
└──────────┬──────────┘
           │ POST/GET
           ▼
┌─────────────────────┐
│  Flask API Server   │
│  (Python)           │
└──────────┬──────────┘
           │ SQL Dotājumi
           ▼
┌─────────────────────┐
│   SQLite Datubāze   │
│  (biblioteka.db)    │
└─────────────────────┘
```

### 5.2 Sesiju Saglabāšana

1. **Lietotājs** rediģē datus web interfeisā
2. **Frontend** nosūta POST/PUT pieprasījumu uz API
3. **Backend** validē un apstrādā datus
4. **SQLite** saglabā datus uz diska (`biblioteka.db`)
5. **Nākamreiz** programmai startējot, dati ir pieejami

### 5.3 Datu Atjaunošana

```javascript
// Frontend - POST pieprasījums
fetch('http://localhost:5000/api/grāmatas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        isbn: '978-9934-0-00001',
        nosaukums: 'Meža diena',
        autors: 'Imants Ziedonis',
        kopiju_skaits: 5
    })
});

// Backend - Dati tiek saglabāti datubāzē
// Nākamajā reizē dati tiek ielādēti no datubāzes
```

---

## 6. DATU FAILAS STRUKTŪRA

```
projekta-mape/
├── app.py                 # Flask backend + datubāzes inicializācija
├── index.html            # Web interfeiss (HTML/CSS/JS)
├── biblioteka.db         # SQLite datubāze (automātiski izveidota)
├── data_model.md         # Datu modelēšanas dokumentācija
├── requirements.md       # Prasību dokumentācija
├── storage_system.md     # Šī dokumentācija
└── dati_jau_pievienoti.txt # Marķieris paraugu datu ielādei
```

---

## 7. DATU BACKUP UN ATJAUNOŠANA

### 7.1 Backup

```bash
# Ielikt datubāzi drošā vietā
cp biblioteka.db biblioteka_backup.db
```

### 7.2 Datubāzes Pārbaudīšana

```python
import sqlite3
conn = sqlite3.connect('biblioteka.db')
cursor = conn.cursor()

# Tablo saraksts
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
print(cursor.fetchall())

# Datu skaits
cursor.execute("SELECT COUNT(*) FROM grāmata")
print(f"Grāmatu skaits: {cursor.fetchone()[0]}")
```

---

## 8. SKALENOJAMĪBAS IESPĒJAS

### Pašreizējā Sistēma (SQLite)
- **Grāmatas:** ~10,000 (pietiek)
- **Lietotāji:** ~1,000 (pietiek)
- **Aizdevumi:** ~100,000 (pietiek)

### Nākotnē Mēroga Palielināšanai

Ja sistēma pieaugs, varētu pārtransferēt uz:
- **PostgreSQL** - lielāka produktivitāte
- **MySQL** - vairāk serveriem
- **MongoDB** - niekļūti dati

Koda struktūra ir pietiekami modulāra, lai atļautu šādu pārmaiņu.

---

## 9. KOPSAVILKUMS

**Bibliotēkas vadības sistēma izmanto SQLite** datu glabāšanai, jo:

| Kritērijs | SQLite | Teksta fails | NoSQL |
|-----------|--------|-------------|-------|
| Meklēšana | ✅ Ātra | ❌ Lēna | ✅ Ātra |
| Relācijas | ✅ Perfekta | ❌ Nav | ⚠️ Grūta |
| Drošība | ✅ ACID | ❌ Nav | ⚠️ Ierobežota |
| Mērogojamība | ✅ Laba | ❌ Slaba | ✅ Ļoti laba |
| Sarežģītība | ✅ Vidēja | ✅ Vienkārša | ⚠️ Augsta |
| **Piemērotība** | **✅ IDEĀLA** | ⚠️ Pieņemama | ❌ Lieka |

Šis dizains nodrošina:
- 🔒 Datu integritāti un drošību
- ⚡ Ātrumu un veiktspēju
- 💾 Persistenci starp sesijām
- 📊 Viegli skaitāma un uzturējama
