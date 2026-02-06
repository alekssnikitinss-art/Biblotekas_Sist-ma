# Prasību Dokuments: Bibliotēkas Vadības Sistēma

## 1. Sistēmas Apraksts

Nelielai bibliotēkai paredzēta digitālā vadības sistēma, kas ļauj:
- Reģistrēt grāmatas bibliotēkas katalogā
- Pārvaldīt lietotāju profilus
- Reģistrēt grāmatu aizdevumus un atgriešanu
- Meklēt grāmatas pēc dažādiem kritērijiem
- Pārraudzīt grāmatu pieejamību

## 2. Funkcionālās Prasības

### 2.1 Grāmatu Vadība
- **FR1.1**: Pievienot jaunu grāmatu katalogā ar informāciju: nosaukums, autors, ISBN, izdošanas gads, žanrs, pieejamo kopiju skaits
- **FR1.2**: Dzēst grāmatu no kataloga
- **FR1.3**: Atjaunināt grāmatas informāciju
- **FR1.4**: Skatīt visas grāmatas katalogā
- **FR1.5**: Meklēt grāmatu pēc nosaukuma, autora vai ISBN
- **FR1.6**: Filtrēt grāmatas pēc žanra

### 2.2 Lietotāju Vadība
- **FR2.1**: Reģistrēt jaunu lietotāju (vārds, uzvārds, e-pasts, telefons)
- **FR2.2**: Dzēst lietotāja profilu
- **FR2.3**: Skatīt sistēmā reģistrētus lietotājus
- **FR2.4**: Atjaunināt lietotāja informāciju

### 2.3 Aizdevumu Vadība
- **FR3.1**: Reģistrēt grāmatu aizdevumu (grāmata, lietotājs, aizdevuma datums, paredzamais atgriešanas datums)
- **FR3.2**: Reģistrēt grāmatas atgriešanu
- **FR3.3**: Skatīt aktīvos aizdevumus
- **FR3.4**: Skatīt aizdevuma vēsturi
- **FR3.5**: Noteikt maksimālo aizdevumu ilgumu (30 dienas)
- **FR3.6**: Brīdināt par nokavētiem aizdevumiem

### 2.4 Statistika un Pārskati
- **FR4.1**: Skatīt grāmatu pieejamības statistiku
- **FR4.2**: Skatīt populārākās grāmatas
- **FR4.3**: Skatīt aktīvu aizdevumu skaitu

## 3. Nefunkcionālās Prasības

### 3.1 Veiktspēja
- **NFR1.1**: Lapas ielādes laiks nedrīkst pārsniegt 2 sekundes
- **NFR1.2**: Meklēšana var apstrādāt līdz 10,000 grāmatām
- **NFR1.3**: Sistēma jāspēj apkalpot vienlaikus 50 lietotājus

### 3.2 Drošība
- **NFR2.1**: Visas datu operācijas jāglabā uz servera
- **NFR2.2**: Ievaddati jāvalidē un jādesinficē
- **NFR2.3**: Dati jāglabā drošā veidā (bez sensitīvas informācijas izpaušanas)

### 3.3 Lietojamība
- **NFR3.1**: Interfeiss jābūt intuitīvam un viegli lietojamam
- **NFR3.2**: Sistēma jāatbalsta gan darbvirsmas, gan mobilos ierīces
- **NFR3.3**: Jābūt norādījumiem un palīdzībai

### 3.4 Datu Integritāte
- **NFR4.1**: Kopijas un aizdevumi jāsincronizē
- **NFR4.2**: Jāprevencē loģiskas kļūdas (piemēram, aizdevums vairāk grāmatu, nekā pieejams)

## 4. Lietotāju Lomas

### 4.1 Bibliotekārs/Administrators
- Pilnā piekļuve visām funkcijām
- Var pievienot/dzēst grāmatas
- Var apstiprinājis/noraidīt aizdevumus (ja nepieciešams)
- Var skatīt statistiku

### 4.2 Parastais lietotājs
- Var meklēt grāmatas
- Var aizņemties grāmatas (ja reģistrēts)
- Var skatīt savas aktīvās aizdevumu
- Var skatīt aizdevuma vēsturi

## 5. Pieņēmumi

- Sistēma ir nelielai bibliotēkai (mazāk nekā 5000 grāmatu)
- Viens bibliotekārs pārvalda sistēmu
- Aizdevumi netiek apstiprinājus, tikai ierakstīti
- Sistēma darbojas lokāli (nevis publiskā interneta)

## 6. Prioritātes

1. **Augsta**: Grāmatu un aizdevumu vadība
2. **Augsta**: Meklēšana un filtēšana
3. **Vidēja**: Lietotāju vadība
4. **Vidēja**: Statistika
5. **Zema**: Paziņojumi par nokavētiem aizdevumiem
