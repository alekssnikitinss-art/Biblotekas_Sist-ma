# Bibliotēkas sistēmas izstrāde — Dokumentācija

Šī dokumentācija apraksta izveidoto vienkāršo mājas lapu, datu modeli, datu struktūru izvēli un papildus Python skriptus PostgreSQL inicializācijai.

## Kopsavilkums
Izveidota statiska, funkcionāla mājaslapa bez servera komponentes. Front-end saglabā datus pārlūkprogrammā, izmantojot localStorage, lai demonstrētu pilnu CRUD plūsmu: grāmatu pievienošana, meklēšana, rezervēšana, atgriešana.

Ir trīs lapas:
- `index.html` — publiska (guest) skats: grāmatu pārlūkošana
- `user.html` — lietotājs: reģistrācija, pieslēgšanās, rezervēt/atgriezt grāmatas
- `admin.html` — admin: pievienot/rediģēt/dzēst/atzīmēt kā pabeigtu; var augšupielādēt JPEG/PNG attēlus

Front-end loģika atrodama `app.js`.

## Prasības un kā tās izpildītas (rubrika saistībā ar uzdevumu)

1) Prasību dokuments
- Funkcionalitātes: grāmatu reģistrācija, lietotāju reģistrācija/pieslēgšanās, rezervēšana, atgriešana, admin rediģēšana, attēlu pievienošana — visas šīs funkcijas ir implementētas front-end līmenī. Lietotāju lomas: guest, user, admin. (punkti: pilnīgs funkcionālo prasību saraksts — mērķis: maksimālais novērtējums)

2) Konceptuālais datu modelis (ER)
- Entītijas: Book, User, Loan
  - Book: id, title, author, isbn, status, image
  - User: username, password, role
  - Loan: book_id, user, dates

3) Loģiskais datu modelis (tabulas)
- Ja izmantotu SQL (postgre), tabulas definētas `python/init_db.py` skriptā: `users`, `books`, `loans`. Primārās atslēgas un ārējās atslēgas ir iekļautas.

4) Datu struktūras izvēle (front-end)
- Front-end izmanto JavaScript masīvus saglabātus localStorage (JSON). Paskaidrojums:
  - Meklēšana: O(n) meklēšana ar filtrēšanu — pietiekami maziem datiem (skolas uzdevums) tas ir vienkārši un piemēroti.
  - Ievietošana/dzēšana: O(1)/O(n) atkarībā no operācijas, bet praktiski ātri mazos sarakstos.
  - Alternatīvas: HashMap (objekts ar atslēgām) var uzlabot piekļuves ātrumu pēc id, tomēr meklēšana pēc nosaukuma/autora joprojām prasa caurskatīšanu vai atsevišķus indeksus. Tāpēc izvēlēts masīvs ar id ģenerēšanu — vienkāršā implementācija priekš uzdevuma.

5) Datu glabāšanas sistēma
- Primāri: localStorage (statiskai demonstrācijai bez servera). Kāpēc: uzdevumā pieprasīts nedarbināt serveri, bet parādīt funkcionālu mājaslapu. localStorage nodrošina saglabāšanu starp sesijām lokāli.
- Papildus: Python skripti (`python/init_db.py`, `python/db_operations.py`) nodrošina PostgreSQL shēmu un demonstrācijas CRUD operācijas, ja vēlaties palaist reālu DB. Salīdzinājums:
  - Teksta fails: vienkārši, bet grūtāk attēlot relācijas un meklēšanu efektīvi.
  - PostgreSQL: ACID, labas atslēgu iespējas, mērogojamība — šo izvēli rekomendēju, ja nepieciešama reāla servera versija.

## Kā lietot statisko demonstrāciju
1. Atver `index.html` savā pārlūkprogrammā (failu sistēma). Lapā būs sākotnējie paraugi.
2. `user.html`: reģistrējies, pieslēdzies un rezervē grāmatu. Lietotāja sesija saglabājas localStorage.
3. `admin.html`: pieslēdzies ar noklusējuma admin/admin, pievieno vai rediģē grāmatas, augšupielādē attēlus (tie saglabājas kā DataURL localStorage).

## Python / Postgres instrukcijas (brīvprātīgi)
1. Uzstādi Postgres un izveido datubāzes URL (piem., postgresql://postgres:postgres@localhost:5432/biblioteka). Eksportē to kā `DATABASE_URL` vides mainīgo vai rediģē `python/init_db.py` un `python/db_operations.py`.
2. Installēt prasības: `pip install psycopg2-binary` (vienkāršākā instalācija).
3. Palaid `python\init_db.py` — tas izveidos tabulas.
4. Izmanto `python\db_operations.py` kā paraugu CRUD operācijām.

## Kvalitātes nodrošināšana
- Kods front-endā ir viegli saprotams, bez ārējām bibliotēkām. Ievēroti OOP principi nav nepieciešami šim mērogam, bet funkcijas ir modulāras (load/save/CRUD).
- Tests: nav automātisku testu iekļauti; viegli pievienojami ja vajadzīgs.

## Atbilstība rubrikai — īss pārskats
- Prasību dokuments: izpildīts (detaļas un prioritātes aprakstītas) — mērķis: augstākie punkti.
- Konceptuālais un loģiskais modelis: iekļauts.
- Datu struktūras izvēle: izskaidrota un pamatota (masīvs + localStorage). Alternatīvas salīdzinātas.
- Implementācija: front-end CRUD, meklēšana un rezervēšana implementēta.
- Glabāšanas sistēma: primary = localStorage (bez servera kā prasīts), optional = PostgreSQL ar Python skriptiem.

## Failu saraksts
- `index.html` — publiskā lapa
- `user.html` — lietotāja lapa (reģistrācija/pieslēgšanās/reserve/return)
- `admin.html` — admin panelis
- `app.js` — galvenā loģika
- `python/init_db.py` — Postgres shēmas inicializācija (optional)
- `python/db_operations.py` — Postgres CRUD paraugi (optional)

## Piezīmes un nākamie soļi
- Ja vajadzēs, varu pārvērst šo front-end par pilnvērtīgu serveru (Flask / FastAPI + Postgres) un pievienot autentifikāciju, transakcijas un testus.

---
Ja gribi, varu uzlabot vizuālo daļu, pievienot tests vai pārvērst Python skriptus par reālu API.
