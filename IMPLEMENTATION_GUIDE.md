# Bibliotēkas Vadības Sistēmas - Ieviešanas Vēlme

## 1. SISTĒMAS ARHITEKTŪRA

```
┌────────────────────────────────────────────────────────────┐
│                   WEB BIBLIOTĒKA                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐        ┌──────────────┐               │
│  │  Frontend    │        │  Backend     │               │
│  │  (HTML/CSS/  │◄────►  │  (Python +   │               │
│  │  JavaScript) │        │   Flask)     │               │
│  └──────────────┘        └──────────────┘               │
│         ▲                        ▲                       │
│         │ HTTP REST API          │ SQL Queries         │
│         └────────────┬───────────┘                     │
│                      │                                 │
│         ┌────────────▼────────────┐                   │
│         │  SQLite Datubāze        │                   │
│         │ (biblioteka.db)         │                   │
│         └─────────────────────────┘                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 2. INSTALĀCIJA UN IEVIEŠANA

### 2.1 Sistēmas Prasības

- **Python** 3.7+
- **Flask** (Python modulis)
- **Flask-CORS** (Cross-Origin Resource Sharing)
- **SQLite** (iekļauts Python paketē)

### 2.2 Instalācijas Soļi

#### 1. Instalējiet Python (ja vēl nav)
```bash
# Windows
# Lejupielādējiet no https://www.python.org/

# Linux/Mac
sudo apt-get install python3
```

#### 2. Instalējiet nepieciešamos moduluus
```bash
pip install flask flask-cors
```

#### 3. Kopējiet failus
```bash
# Visus failus kopējiet vienā mapē:
# - app.py
# - index.html
```

#### 4. Startējiet serveri
```bash
python app.py
```

#### 5. Atvērt web interfeisu
Pārlūkprogrammā atveriet: `http://localhost:5000`

### 2.3 Datubāzes Inicializācija

Programma **automātiski** inicializē datubāzi:

```python
if __name__ == '__main__':
    init_db()  # Izveido tabulas, ja tās nepastāv
    # ... palaida paraugu datus
    app.run(debug=True, port=5000)
```

## 3. DATU STRUKTŪRU PĀRSKATS

### 3.1 Tabula: GRĀMATA

```
┌─────────────────────────────────────────────────────┐
│ grāmata (ISBN - primāra atslēga)                   │
├─────────────────────────────────────────────────────┤
│ isbn                  | VARCHAR(20) PRIMARY KEY    │
│ nosaukums             | VARCHAR(255) NOT NULL      │
│ autors                | VARCHAR(255) NOT NULL      │
│ izdošanas_gads        | INTEGER                    │
│ žanrs                 | VARCHAR(100)               │
│ kopiju_skaits         | INTEGER DEFAULT 0          │
│ pieejamās_kopijas     | INTEGER DEFAULT 0          │
│ pievienošanas_datums  | DATETIME DEFAULT NOW()     │
│                       |                            │
│ Indeksi:              |                            │
│ - idx_nosaukums       | Ātra meklēšana pēc nosaukuma  │
│ - idx_autors          | Āta meklēšana pēc autora     │
│ - idx_žanrs           | Āta filtrēšana pēc žanra     │
└─────────────────────────────────────────────────────┘
```

**Piemērs Dati:**
| isbn | nosaukums | autors | izdošanas_gads | kopijas | pieejamas |
|------|-----------|--------|----------------|---------|-----------|
| 978-9934-0-00001 | Meža diena | Imants Ziedonis | 1991 | 3 | 2 |
| 978-9934-0-00002 | Putnu pēdas smiltīs | Ināra Čaklā | 1995 | 2 | 1 |

### 3.2 Tabula: LIETOTĀJS

```
┌─────────────────────────────────────────────────────┐
│ lietotājs (id - primāra atslēga)                   │
├─────────────────────────────────────────────────────┤
│ id                    | INTEGER AUTO_INCREMENT     │
│ vārds                 | VARCHAR(100) NOT NULL      │
│ uzvārds               | VARCHAR(100) NOT NULL      │
│ e_pasts               | VARCHAR(255) UNIQUE        │
│ telefons              | VARCHAR(20)                │
│ reģistrācijas_datums  | DATETIME DEFAULT NOW()     │
│                       |                            │
│ Indeksi:              |                            │
│ - PRIMARY KEY: id     | Unikāls identifikators     │
│ - UNIQUE: e_pasts     | Katrs e-pasts ir unikāls   │
└─────────────────────────────────────────────────────┘
```

### 3.3 Tabula: AIZDEVUMS

```
┌────────────────────────────────────────────────────┐
│ aizdevums (id - primāra atslēga)                  │
├────────────────────────────────────────────────────┤
│ id                           | INTEGER AUTO_INC   │
│ isbn (FK)                    | VARCHAR(20)        │
│ lietotāja_id (FK)            | INTEGER            │
│ aizdevuma_datums             | DATETIME DEFAULT   │
│ paredzamais_atgriešanas_dat  | DATE NOT NULL      │
│ faktiskais_atgriešanas_dat   | DATE (nullable)    │
│ statuss                      | TEXT ('aktīvs'     │
│                              | vai 'atgriezts')   │
│                              |                    │
│ Ārējās Atslēgas:             |                    │
│ - isbn → grāmata.isbn        |                    │
│ - lietotāja_id → lietotājs.id|                    │
│                              |                    │
│ Indeksi:                     |                    │
│ - lietotāja_id               |                    │
│ - statuss                    |                    │
│ - paredzamais_atgriešanas_dat|                    │
└────────────────────────────────────────────────────┘
```

## 4. API PĀRSKATS

### 4.1 Grāmatu API

```
GET    /api/grāmatas
       Iegūst visas grāmatas
       
GET    /api/grāmatas/meklēt?q=nosaukums&žanrs=romans
       Meklē grāmatas pēc teksta un žanra
       
GET    /api/grāmatas/žanri
       Iegūst visus pieejamos žanrus
       
POST   /api/grāmatas
       Pievieno jaunu grāmatu
       Body: {isbn, nosaukums, autors, izdošanas_gads, žanrs, kopiju_skaits}
       
PUT    /api/grāmatas/{isbn}
       Atjaunina grāmatas informāciju
       
DELETE /api/grāmatas/{isbn}
       Dzēš grāmatu (ja nav aktīvo aizdevumu)
```

### 4.2 Lietotāju API

```
GET    /api/lietotāji
       Iegūst visus lietotājus
       
POST   /api/lietotāji
       Reģistrē jaunu lietotāju
       Body: {vārds, uzvārds, e_pasts, telefons}
       
DELETE /api/lietotāji/{id}
       Dzēš lietotāju (ja nav aktīvo aizdevumu)
```

### 4.3 Aizdevumu API

```
GET    /api/aizdevumi?statuss=aktīvs
       Iegūst aizdevumus pēc stāvokļa
       
POST   /api/aizdevumi
       Reģistrē grāmatas aizdevumu
       Body: {isbn, lietotāja_id}
       
POST   /api/aizdevumi/{id}/atgriezt
       Reģistrē grāmatas atgriešanu
```

### 4.4 Statistikas API

```
GET    /api/statistika
       Iegūst sistēmas statistiku
       Response: {
           grāmatu_skaits: 5,
           lietotāju_skaits: 3,
           aktīvie_aizdevumi: 2,
           nokavētie_aizdevumi: 1,
           populārākās_grāmatas: [...]
       }
```

## 5. DATU PLŪSMA - PIEMĒRS

### Scenārijs: Lietotājs aizņemas grāmatu

```
┌────────────────────────────────────────────────────────┐
│ 1. LIETOTĀJS NOSPIEŽ "AIZŅEMTIES"                     │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│ 2. FRONTEND NOSŪTA POST PIEPRASĪJUMU                  │
│    POST /api/aizdevumi                               │
│    {isbn: "978-9934-0-00001", lietotāja_id: 1}      │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│ 3. BACKEND VALIDĒ DATUS                              │
│    - Grāmata pastāv?                                 │
│    - Lietotājs pastāv?                               │
│    - Pieejama grāmata?                               │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│ 4. BACKEND SAGLABĀ DATUS                             │
│    INSERT INTO aizdevums (isbn, lietotāja_id, ...)   │
│    UPDATE grāmata SET pieejamās_kopijas = ...        │
│    COMMIT                                             │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│ 5. DATUBĀZE SAGLABĀ DATUS UZ DISKA                   │
│    biblioteka.db → Jauns aizdevums ieraksts          │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│ 6. BACKEND ATGRIEŽ PANĀKUMA ATBILDI                  │
│    {ziņa: "Aizdevums reģistrēts"}                    │
└────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│ 7. FRONTEND ATJAUNINA SKRĪNU                         │
│    - Ielādē aizdevumu sarakstu                       │
│    - Parāda panākuma paziņojumu                      │
└────────────────────────────────────────────────────────┘
```

## 6. DATUBĀZES DATŅU PĀRVALDĪŠANA

### 6.1 Datubāzes Apskate

```python
import sqlite3

# Savienojas ar datubāzi
conn = sqlite3.connect('biblioteka.db')
cursor = conn.cursor()

# Skatīt visas tabulas
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print("Tabulas:", tables)

# Skatīt grāmatu skaitu
cursor.execute("SELECT COUNT(*) FROM grāmata")
count = cursor.fetchone()[0]
print(f"Grāmatu skaits: {count}")

# Skatīt visas grāmatas
cursor.execute("SELECT isbn, nosaukums, autors FROM grāmata")
books = cursor.fetchall()
for book in books:
    print(f"{book[0]} - {book[1]} ({book[2]})")

conn.close()
```

### 6.2 Datubāzes Mazsveice

```python
# Izdzēst visus datus un sākt no jauna
import os
os.remove('biblioteka.db')  # Datubāze tiks atkārtoti izveidota programmas startējot

# Vai:
# Apsargi dati, ja nepieciešams
```

### 6.3 Datubāzes Eksportēšana

```python
# Eksportēt CSV formātā
import csv
import sqlite3

conn = sqlite3.connect('biblioteka.db')
cursor = conn.cursor()

# Eksportējam grāmatas
cursor.execute("SELECT * FROM grāmata")
books = cursor.fetchall()

with open('grāmatas.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['ISBN', 'Nosaukums', 'Autors', 'Gads', 'Žanrs', 'Kopijas', 'Pieejamas'])
    writer.writerows(books)

print("Eksportēts uz grāmatas.csv")
```

## 7. PROBLĒMU NOVĒRŠANA

### Problēma: "ModuleNotFoundError: No module named 'flask'"
**Risinājums:**
```bash
pip install flask flask-cors
```

### Problēma: "Port 5000 already in use"
**Risinājums:**
```python
# app.py izmainīt port
app.run(debug=True, port=5001)  # Mainīt uz citu portu
```

### Problēma: CORS kļūdas
**Risinājums:** CORS jau ieslēgts `app.py`:
```python
from flask_cors import CORS
CORS(app)
```

## 8. ATTĪSTĪBAS PLĀNS

### Iespējamie Uzlabojumi

1. **Autentifikācija**
   - Lietotāja pieteikšanās sistēma
   - Dažādi piekļuves līmeņi

2. **Paziņojumi**
   - E-pasta paziņojumi par nokavētiem aizdevumiem
   - SMS brīdinājumi

3. **Meklēšana**
   - Pilna teksta meklēšana
   - Filtri un sorēšana

4. **Statistika**
   - Detalizētie pārskati
   - Grafiki un diagrammas

5. **Mobilā Versija**
   - React Native aplikācija
   - iOS un Android versija

## 9. DESKUSIJU TĒMAS

- **Datu Drošība:** Kā paroles ir šifrētas? (Pašlaik nav, var pievienot bcrypt)
- **Datu Backup:** Kā regulāri draudzēt datubāzi?
- **Mērogojamība:** Kā pārtransferēt uz liela datubāzi?
- **Veiktspēja:** Kā optimizēt meklēšanu ar lielu datu apjomu?

## 10. SECINĀJUMI

Šī bibliotēkas vadības sistēma nodrošina:

✅ **Vienkāršu Ieviešanu**
- Minimums nepieciešamo prakšu
- Izveidota sa Flask, HTML/CSS/JS

✅ **Drošu Datu Glabāšanu**
- SQLite datubāze ar indeksiem
- Datu integritāte ar ārējām atslēgām
- Transakcijas un validācija

✅ **Labas Veiktspējas**
- SQL indeksi ātrajai meklēšanai
- Parametrizēti dotājumi (SQL injekcijas aizsardzība)
- Vienkārša mērogojamība

✅ **Lietojamību**
- Moderns web interfeiss
- Intuitīvi vadības poga
- Bezmaksas, atvērts kods

---

**Sistēma ir gatava naudošanai un attīstīšanai!**
