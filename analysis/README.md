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

You can also analyze CSV files downloaded from the two Supabase tables:

```bash
python analysis/analyze.py trial_responses_rows.csv --sessions-csv study_sessions_rows.csv
```

For test-mode exports, add `--include-test`:

```bash
python analysis/analyze.py test_trial_responses_rows.csv --sessions-csv test_study_sessions_rows.csv --include-test
```

Add `--show-title` to display `Type: Sequence` or `Type: Kinematic` above each plot. Titles are hidden by default.

Analysis excludes test sessions and incomplete participants. A participant is eligible only after completing at least one attention check and answering every attention check correctly. It generates `sequence_MMDDHHMM.csv`/`.png` and `kinematic_MMDDHHMM.csv`/`.png`, showing preference percentages for `Pure KIMODO`, `Moa-KIMODO`, and `Neither`. Preferences are decoded from the randomized A/B placement using `preferred_method`. The attention-check pass/fail counts are saved only to `attention_summary_MMDDHHMM.csv`; no attention plot is generated. Optional legacy summaries remain available in `additional_summaries()` but are not run by default.

Raw exports, filtered tables, and figures are separated under `data/raw`, `data/processed`, and `figures`. Their generated contents are ignored by Git.
