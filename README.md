# Motion Agent User Study

A static A/B preference study for comparing two motion-generation methods on the same instruction prompt. Participants choose which video better matches the instruction.

## Setup

1. Run `backend/setup.sql` in the Supabase SQL Editor.
2. Add the Supabase URL and public anon key to `config.js`.
3. Set each study trial's `type` in `trials.js` to `sequence` or `kinematic`. Configure the attention checks and the two comprehension checks, including each comprehension check's real-looking prompt and unambiguous `expected_method`, then place all videos in `videos/`.
4. Test locally with `python3 -m http.server 8000` and deploy with GitHub Pages.
5. See `analysis/README.md` for data export and analysis.

To run `trial_test01`, `trial_test02`, one attention check, and one comprehension check with real backend submission, open the study with `?test=1`, for example `http://localhost:8000/?test=1`. The four questions are randomized, test sessions are tagged in Supabase, and they are excluded from analysis by default.

The browser normalizes the submitted email and converts it into a deterministic UUID using SHA-256. Only that UUID is sent to Supabase; the raw email is not stored. This is pseudonymization rather than irreversible anonymization.

Each participant receives 15 randomly selected study trials, 2 attention checks, and 2 comprehension checks in randomized order, for 19 questions total. Each attention check randomly instructs the participant to select A, B, or No preference. Comprehension checks look identical to regular trials but have a configured correct method; participants must answer every comprehension check correctly for their data to be included in analysis.

Study records are scheduled for deletion by August 31, 2027. After exporting the final data, run `backend/delete_all_study_data.sql`. Managed backups can remain available for the Supabase plan's backup-retention period; deleting the Supabase project removes its associated backups.

Never put the Supabase service-role key in frontend code or Git.
