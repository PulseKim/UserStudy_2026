# Analysis

Use Python 3.10+ and keep the service-role key local; it bypasses RLS.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r analysis/requirements.txt
export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=YOUR_PRIVATE_SERVICE_ROLE_KEY
python analysis/export_data.py
python analysis/analyze.py analysis/data/raw/study_export_TIMESTAMP.json
```

Analysis excludes incomplete participants and attention-check failures by default. Override with `--include-incomplete` and/or `--include-attention-failures`. It reports overall preference, preference by `sequence`/`kinematic` type, per-trial results, attention checks, balance, exposure, and response times.

Raw exports, filtered tables, and figures are separated under `data/raw`, `data/processed`, and `figures`. Their generated contents are ignored by Git.
