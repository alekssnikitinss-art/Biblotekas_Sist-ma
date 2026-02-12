erDiagram
    USERS {
        int id PK
        VARCHAR username
        VARCHAR password_hash
        VARCHAR role
        TIMESTAMP created_at
    }

    BOOKS {
        int id PK
        VARCHAR title
        VARCHAR author
        VARCHAR isbn
        TEXT image
        VARCHAR status
        TIMESTAMP created_at
    }

    RESERVATIONS {
        int id PK
        int book_id FK
        int user_id FK
        TIMESTAMP reserved_at
        VARCHAR status
    }

    USERS ||--o{ RESERVATIONS : makes
    BOOKS ||--o{ RESERVATIONS : includes