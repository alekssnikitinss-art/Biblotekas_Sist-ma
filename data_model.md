# Datu Modelēšana: Bibliotēkas Vadības Sistēma

## 1. KONCEPTUĀLAIS DATU MODELIS (ER Diagramma)

```
┌─────────────────┐
│     GRĀMATA     │
├─────────────────┤
│ ISBN (PK)       │
│ Nosaukums       │
│ Autors          │
│ Izdošanas gads  │
│ Žanrs           │
│ Kopiju skaits   │
│ Pieejamās       │
└─────────────────┘
         │
         │ 1:N (grāmata var tikt aizņemta vairākas reizes)
         │
┌─────────────────┐
│   AIZDEVUMS     │
├─────────────────┤
│ ID (PK)         │
│ ISBN (FK)       │
│ Lietotāja ID(FK)│
│ Aizdevuma dat.  │
│ Atgr. termiņš    │
│ Faktiska atgr.  │
└─────────────────┘
         │
         │ N:1 (aizdevums pieder vienam lietotājam)
         │
┌─────────────────┐
│   LIETOTĀJS     │
├─────────────────┤
│ ID (PK)         │
│ Vārds           │
│ Uzvārds         │
│ E-pasts         │
│ Telefons        │
│ Reģ. datums     │
└─────────────────┘
```

### 1.1 Entītijas

#### GRĀMATA
- **Primāra atslēga**: ISBN (unikāls identifikators)
- **Atribūti**:
  - Nosaukums (teksts, nepieciešams)
  - Autors (teksts, nepieciešams)
  - Izdošanas gads (skaitlis)
  - Žanrs (teksts)
  - Kopiju skaits (skaitlis, sākotnējais skaits)
  - Pieejamas kopijas (skaitlis, pašreizējais skaits)

#### LIETOTĀJS
- **Primāra atslēga**: ID (automātiski ģenerēts)
- **Atribūti**:
  - Vārds (teksts, nepieciešams)
  - Uzvārds (teksts, nepieciešams)
  - E-pasts (teksts, unikāls)
  - Telefons (teksts)
  - Reģistrācijas datums (datums)

#### AIZDEVUMS
- **Primāra atslēga**: ID (automātiski ģenerēts)
- **Ārējās atslēgas**:
  - ISBN (norāda uz GRĀMATA)
  - Lietotāja ID (norāda uz LIETOTĀJS)
- **Atribūti**:
  - Aizdevuma datums (datums, nepieciešams)
  - Paredzamais atgriešanas datums (datums, nepieciešams)
  - Faktiskais atgriešanas datums (datums, nav obligāts - NULL, ja vēl neatgriezta)
  - Statuss (teksts: "aktīvs" vai "atgriezts")

### 1.2 Saites
- **1:N starp GRĀMATA un AIZDEVUMS**: Viena grāmata var tikt aizņemta vairākas reizes
- **1:N starp LIETOTĀJS un AIZDEVUMS**: Viens lietotājs var aizņemties vairākas grāmatas

---

## 2. LOĢISKAIS DATU MODELIS (Tabulu Shēmas)

### 2.1 Tabula GRĀMATA

```sql
CREATE TABLE grāmata (
    isbn VARCHAR(20) PRIMARY KEY,
    nosaukums VARCHAR(255) NOT NULL,
    autors VARCHAR(255) NOT NULL,
    izdošanas_gads INT,
    žanrs VARCHAR(100),
    kopiju_skaits INT NOT NULL DEFAULT 0,
    pieejamās_kopijas INT NOT NULL DEFAULT 0,
    pievienošanas_datums DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Lauku apraksts:**
- `isbn`: Grāmatas unikālais identifikators (primāra atslēga), maksimums 20 rakstzīmes
- `nosaukums`: Grāmatas nosaukums, obligāts lauks
- `autors`: Grāmatas autors, obligāts lauks
- `izdošanas_gads`: Gads, kad grāmata tika publicēta
- `žanrs`: Grāmatas žanrs (romāns, detektīvs, zinātniskā fantastika utt.)
- `kopiju_skaits`: Kopiju skaits bibliotēkā (pavisam)
- `pieejamās_kopijas`: Cik kopiju pašlaik pieejamas aizņemšanai
- `pievienošanas_datums`: Datums, kad grāmata tika pievienota sistēmai

**Indeksi:**
- PRIMARY KEY: `isbn`
- INDEX: `nosaukums` (ātra meklēšana pēc nosaukuma)
- INDEX: `autors` (ātra meklēšana pēc autora)
- INDEX: `žanrs` (ātra filtrēšana pēc žanra)

---

### 2.2 Tabula LIETOTĀJS

```sql
CREATE TABLE lietotājs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vārds VARCHAR(100) NOT NULL,
    uzvārds VARCHAR(100) NOT NULL,
    e_pasts VARCHAR(255) UNIQUE NOT NULL,
    telefons VARCHAR(20),
    reģistrācijas_datums DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Lauku apraksts:**
- `id`: Unikālais lietotāja identifikators (primāra atslēga), automātiski ģenerēts
- `vārds`: Lietotāja vārds, obligāts
- `uzvārds`: Lietotāja uzvārds, obligāts
- `e_pasts`: Lietotāja e-pasta adrese (unikāla), obligāta
- `telefons`: Kontakttelefons (nav obligāts)
- `reģistrācijas_datums`: Datums, kad lietotājs reģistrējās

**Indeksi:**
- PRIMARY KEY: `id`
- UNIQUE: `e_pasts` (e-pasts ir unikāls katram lietotājam)
- INDEX: `uzvārds` (ātra meklēšana pēc uzvārda)

---

### 2.3 Tabula AIZDEVUMS

```sql
CREATE TABLE aizdevums (
    id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL,
    lietotāja_id INT NOT NULL,
    aizdevuma_datums DATETIME DEFAULT CURRENT_TIMESTAMP,
    paredzamais_atgriešanas_datums DATE NOT NULL,
    faktiskais_atgriešanas_datums DATE,
    statuss ENUM('aktīvs', 'atgriezts') DEFAULT 'aktīvs',
    FOREIGN KEY (isbn) REFERENCES grāmata(isbn),
    FOREIGN KEY (lietotāja_id) REFERENCES lietotājs(id) ON DELETE CASCADE
);
```

**Lauku apraksts:**
- `id`: Aizdevuma unikālais identifikators (primāra atslēga), automātiski ģenerēts
- `isbn`: Atsauce uz grāmatu (ārējā atslēga), obligāta
- `lietotāja_id`: Atsauce uz lietotāju (ārējā atslēga), obligāta
- `aizdevuma_datums`: Datums, kad grāmata tika aizņemta
- `paredzamais_atgriešanas_datums`: Datums, līdz kuram grāmata jāatgriež (parasti 30 dienas pēc aizdevuma)
- `faktiskais_atgriešanas_datums`: Faktiskais atgriešanas datums (NULL, ja vēl neatgriezta)
- `statuss`: Aizdevuma stāvoklis ('aktīvs' = neatgriezts, 'atgriezts' = grāmata atgriezta)

**Ārējās atslēgas (Constraints):**
- `isbn` atsauc uz `grāmata(isbn)`
- `lietotāja_id` atsauc uz `lietotājs(id)` ar `ON DELETE CASCADE` (ja lietotājs tiek dzēsts, arī tā aizdevumi tiek dzēsti)

**Indeksi:**
- PRIMARY KEY: `id`
- FOREIGN KEY: `isbn`
- FOREIGN KEY: `lietotāja_id`
- INDEX: `lietotāja_id` (ātra meklēšana pēc lietotāja)
- INDEX: `statuss` (ātra filtrēšana pēc stāvokļa - aktīvs vs atgriezts)
- INDEX: `paredzamais_atgriešanas_datums` (ātra filtrēšana pēc termiņa)

---

## 3. DATU INTEGRITĀTES IEROBEŽOJUMI (Constraints)

1. **Grāmata**:
   - `kopiju_skaits` ≥ 0
   - `pieejamās_kopijas` ≥ 0
   - `pieejamās_kopijas` ≤ `kopiju_skaits`

2. **Lietotājs**:
   - `e_pasts` jābūt derīgam e-pasta formātam
   - `vārds` un `uzvārds` nav tukši

3. **Aizdevums**:
   - `paredzamais_atgriešanas_datums` > `aizdevuma_datums`
   - `faktiskais_atgriešanas_datums` ≥ `aizdevuma_datums` (ja ir norādīts)
   - Ja `faktiskais_atgriešanas_datums` ir norādīts, `statuss` = 'atgriezts'
   - Nevar aizņemties vairāk grāmatu, nekā pieejams (`pieejamās_kopijas` > 0)

---

## 4. DATU PLŪSMA

```
Lietotājs → [Web Interfeiss] → [Node.js/Express Servers] → [SQLite Datubāze]
                                          ↓
                              [Datu Validācija & Apstrāde]
                                          ↓
                              [Rezultāti atpakaļ lietotājam]
```

---

## 5. DATU GLABĀŠANAS VIETA

- **Grāmatas**: `grāmata` tabula - satur statisko informāciju
- **Lietotāji**: `lietotājs` tabula - satur reģistrācijas informāciju
- **Aizdevumi**: `aizdevums` tabula - satur dinamisko informāciju par aizdevumiem

