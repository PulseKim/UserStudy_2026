#!/usr/bin/env python3
"""Filter exported data, compute summaries, and create publication-quality plots."""
import argparse, json
from pathlib import Path
import matplotlib.pyplot as plt
import pandas as pd

ROOT=Path(__file__).parent; OUT=ROOT/"data"/"processed"; FIG=ROOT/"figures"
plt.rcParams.update({"figure.dpi":150,"savefig.dpi":300,"axes.spines.top":False,"axes.spines.right":False})
def prefs(df, group):
    result=df.groupby([group,"preferred_method"]).size().rename("count").reset_index()
    result["proportion"]=result["count"]/result.groupby(group)["count"].transform("sum")
    return result
def plot(table,index,title,path,stacked=False):
    if table.empty: return
    p=table.pivot(index=index,columns="preferred_method",values="proportion").fillna(0)
    ax=p.plot.bar(stacked=stacked,figsize=(max(6,len(p)*.55),4.5),width=.8)
    ax.set(title=title,xlabel="",ylabel="Proportion preferred",ylim=(0,1)); ax.legend(title="Preferred method",frameon=False)
    plt.tight_layout(); plt.savefig(path); plt.close()
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("snapshot",type=Path); ap.add_argument("--include-incomplete",action="store_true")
    ap.add_argument("--include-attention-failures",action="store_true"); args=ap.parse_args()
    data=json.loads(args.snapshot.read_text(encoding="utf-8")); sessions=pd.DataFrame(data["study_sessions"])
    responses=pd.json_normalize(data["trial_responses"],sep=".")
    if not args.include_incomplete: sessions=sessions[sessions.completion_status.eq("complete")]
    if not args.include_attention_failures: sessions=sessions[sessions.passed_attention_check.eq(True)]
    responses=responses[responses.participant_id.isin(sessions.participant_id)].copy()
    study=responses[~responses.is_attention_check.fillna(False)].copy(); OUT.mkdir(parents=True,exist_ok=True); FIG.mkdir(parents=True,exist_ok=True)
    sessions.to_csv(OUT/"sessions_filtered.csv",index=False); responses.to_csv(OUT/"responses_filtered.csv",index=False)
    overall=prefs(study.assign(overall="Overall"),"overall"); bytrial=prefs(study,"trial_id")
    bytype=prefs(study.dropna(subset=["trial_type"]),"trial_type") if "trial_type" in study else pd.DataFrame()
    exposure=study.groupby("trial_id").size().rename("observations").reset_index()
    balance=pd.concat([study.left_method.value_counts().rename("left"),study.right_method.value_counts().rename("right")],axis=1).fillna(0)
    attention=responses[responses.is_attention_check.fillna(False)].attention_check_correct.value_counts(dropna=False).rename_axis("correct").rename("count")
    outputs={"preference_overall":overall,"preference_by_trial":bytrial,"preference_by_type":bytype,"trial_exposure":exposure,
             "left_right_balance":balance,"response_time_summary":study.response_time_ms.describe(percentiles=[.25,.5,.75,.95]),"attention_summary":attention}
    for name,frame in outputs.items(): frame.to_csv(OUT/f"{name}.csv",index=name in {"left_right_balance","response_time_summary","attention_summary"})
    plot(overall,"overall","Overall method preference",FIG/"preference_overall.png")
    plot(bytype,"trial_type","Preference by trial type",FIG/"preference_by_type.png",True)
    plot(bytrial,"trial_id","Preference by trial",FIG/"preference_by_trial.png",True)
    if not attention.empty:
        ax=attention.plot.bar(figsize=(5,4),color="#4C78A8",title="Attention-check responses"); ax.set(xlabel="Correct",ylabel="Responses"); plt.tight_layout(); plt.savefig(FIG/"attention_checks.png"); plt.close()
    if not exposure.empty:
        ax=exposure.plot.bar(x="trial_id",y="observations",legend=False,figsize=(max(7,len(exposure)*.45),4),color="#4C78A8",title="Observations per trial"); ax.set(xlabel="",ylabel="Observations"); plt.tight_layout(); plt.savefig(FIG/"observations_per_trial.png"); plt.close()
    print(f"Analyzed {len(sessions)} participants and {len(responses)} responses.")
if __name__ == "__main__": main()
