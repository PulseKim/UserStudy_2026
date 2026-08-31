#!/usr/bin/env python3
"""Export all Supabase study data to versioned local snapshots."""
import argparse, json, os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import pandas as pd

OUT = Path(__file__).parent / "data" / "raw"
def fetch(url, key, table):
    rows, offset = [], 0
    while True:
        query = urlencode({"select":"*", "order":"created_at.asc", "limit":1000, "offset":offset})
        req = Request(f"{url.rstrip('/')}/rest/v1/{table}?{query}", headers={"apikey":key,"Authorization":f"Bearer {key}"})
        with urlopen(req) as response: page = json.load(response)
        rows.extend(page)
        if len(page) < 1000: return rows
        offset += 1000
def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--label"); args=parser.parse_args()
    url,key=os.getenv("SUPABASE_URL"),os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key: raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see analysis/.env.example).")
    label=args.label or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"); OUT.mkdir(parents=True,exist_ok=True)
    data={table:fetch(url,key,table) for table in ("study_sessions","trial_responses")}
    (OUT/f"study_export_{label}.json").write_text(json.dumps(data,indent=2),encoding="utf-8")
    for table,rows in data.items(): pd.json_normalize(rows,sep=".").to_csv(OUT/f"{table}_{label}.csv",index=False)
    print(f"Exported {len(data['study_sessions'])} sessions and {len(data['trial_responses'])} responses ({label}).")
if __name__ == "__main__": main()
