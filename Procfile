# Use a single worker on Render to avoid SQLite locking issues; use threads for light concurrency
web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4
