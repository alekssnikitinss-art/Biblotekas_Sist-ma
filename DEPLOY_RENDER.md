Deploying Bibliotēkas_Sistēma to Render.com

This document walks through deploying the app and optionally provisioning a managed PostgreSQL database.

1) Prepare repository
- Ensure the repository contains these files at the root:
  - `app.py`, `index.html`, `admin.html`, `requirements.txt`, `Procfile`, and other project files.
- Commit and push to GitHub (or GitLab/Bitbucket) so Render can access it.

2) Create a Web Service on Render
- In Render dashboard choose "New" -> "Web Service".
- Connect your repo and choose the branch (usually `main`).
- Build Command: leave blank (Render will run pip install -r requirements.txt by default), or you may set it to:
    pip install -r requirements.txt
- Start Command: leave blank to use Procfile, or set explicitly:
    gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4
  (We recommend 1 worker for SQLite. For production use Postgres and more workers.)
- Environment: choose the region and plan you want, then create the service and deploy.

3) Set ADMIN_TOKEN environment variable (recommended for production)
- In the Render service Dashboard -> Environment -> Environment Variables add `ADMIN_TOKEN` with a strong secret value.
- When `ADMIN_TOKEN` is set, write (POST/PUT/DELETE) operations require the `X-Admin-Token` header with that value.
- Use `admin.html` to manage data; log in there with the token.

4) (Optional) Use a managed PostgreSQL instead of SQLite (recommended for production)
- In Render dashboard choose "New" -> "Postgres" to create a managed DB.
- After creating, Render will provide a DATABASE_URL. For example:
    postgres://user:password@db-host:5432/dbname
- Add this DATABASE_URL as an environment variable in the Web Service settings.

Important: This project currently uses SQLite. To switch to Postgres you should migrate the DB layer to a proper adapter (SQLAlchemy is recommended). The steps below outline a migration path.

Postgres migration (recommended approach using SQLAlchemy)
1) Add SQLAlchemy and a Postgres driver to `requirements.txt`:
    SQLAlchemy==2.0.XX
    psycopg2-binary==2.9.6
   Then run `pip install -r requirements.txt` locally.

2) Replace the SQLite-specific functions in `app.py` with SQLAlchemy models and session handling. Example outline:
- Create a new module `db.py`:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker, declarative_base
    from sqlalchemy import Column, Integer, String, DateTime, Text
    import os

    DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{Path(__file__).parent / "biblioteka.db"}')
    engine = create_engine(DATABASE_URL, echo=False, future=True)
    SessionLocal = sessionmaker(bind=engine)
    Base = declarative_base()

    class Gramata(Base):
        __tablename__ = 'gramata'  # pick ascii-compatible names to simplify
        isbn = Column(String, primary_key=True)
        nosaukums = Column(String)
        # ... other columns

    def init_db():
        Base.metadata.create_all(bind=engine)

3) Update `app.py` to import `SessionLocal` and models from `db.py` and use sessions for queries.

4) Create migration scripts or use Alembic for schema migrations.

5) On Render set `DATABASE_URL` and redeploy. The app will connect to Postgres.

Notes about identifiers and encoding
- This codebase uses non-ASCII table/column names (e.g., `grāmata`, `žanrs`). While SQLite handles these names, many RDBMS and ORMs prefer ascii-only identifiers. When migrating to Postgres, consider renaming tables/columns to ascii names (e.g., `gramata`, `zanrs`) and mapping them in your models.

5) Verify admin UI
- After deployment and setting `ADMIN_TOKEN`, visit the app URL (Render provides it) and open `/admin.html` to manage books and users.
- `admin.html` stores the token in-memory (page session) and sends it in the `X-Admin-Token` header for write operations.

Troubleshooting
- If gunicorn fails with "ModuleNotFoundError: No module named 'your_application'": ensure `Procfile` is present and that the Start Command refers to `app:app` (module:variable).
- If you see pkg_resources warnings: we pinned `setuptools<81` in `requirements.txt` to reduce that message.
- If the app logs show SQLite locking errors under concurrency, reduce gunicorn workers to 1 (we set that in `Procfile`) or migrate to Postgres.

If you'd like, I can:
- Convert the project to SQLAlchemy + Postgres now and add a working migration + sample `db.py` and model definitions.
- Add a small `render.yaml` to pin service settings for Render.

Tell me which you'd prefer and I'll implement it.
