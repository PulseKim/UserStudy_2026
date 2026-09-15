// Replace every placeholder prompt with the instruction used to generate that trial's videos.
// Update each type to match the actual prompt: "sequence" or "kinematic".
const TRIAL_CONFIG = [
  { id: "trial_test01", type: "sequence", prompt: "This is a test prompt1." },
  { id: "trial_test02", type: "kinematic", prompt: "This is a test prompt2." },
  { id: "trial_001", type: "sequence", prompt: "Replace with the motion prompt for trial 001." },
  { id: "trial_002", type: "sequence", prompt: "Replace with the motion prompt for trial 002." },
  { id: "trial_003", type: "sequence", prompt: "Replace with the motion prompt for trial 003." },
  { id: "trial_004", type: "sequence", prompt: "Replace with the motion prompt for trial 004." },
  { id: "trial_005", type: "sequence", prompt: "Replace with the motion prompt for trial 005." },
  { id: "trial_006", type: "sequence", prompt: "Replace with the motion prompt for trial 006." },
  { id: "trial_007", type: "sequence", prompt: "Replace with the motion prompt for trial 007." },
  { id: "trial_008", type: "sequence", prompt: "Replace with the motion prompt for trial 008." },
  { id: "trial_009", type: "sequence", prompt: "Replace with the motion prompt for trial 009." },
  { id: "trial_010", type: "sequence", prompt: "Replace with the motion prompt for trial 010." },
  { id: "trial_011", type: "sequence", prompt: "Replace with the motion prompt for trial 011." },
  { id: "trial_012", type: "sequence", prompt: "Replace with the motion prompt for trial 012." },
  { id: "trial_013", type: "sequence", prompt: "Replace with the motion prompt for trial 013." },
  { id: "trial_014", type: "sequence", prompt: "Replace with the motion prompt for trial 014." },
  { id: "trial_015", type: "sequence", prompt: "Replace with the motion prompt for trial 015." },
  { id: "trial_016", type: "kinematic", prompt: "Replace with the motion prompt for trial 016." },
  { id: "trial_017", type: "kinematic", prompt: "Replace with the motion prompt for trial 017." },
  { id: "trial_018", type: "kinematic", prompt: "Replace with the motion prompt for trial 018." },
  { id: "trial_019", type: "kinematic", prompt: "Replace with the motion prompt for trial 019." },
  { id: "trial_020", type: "kinematic", prompt: "Replace with the motion prompt for trial 020." },
  { id: "trial_021", type: "kinematic", prompt: "Replace with the motion prompt for trial 021." },
  { id: "trial_022", type: "kinematic", prompt: "Replace with the motion prompt for trial 022." },
  { id: "trial_023", type: "kinematic", prompt: "Replace with the motion prompt for trial 023." },
  { id: "trial_024", type: "kinematic", prompt: "Replace with the motion prompt for trial 024." },
  { id: "trial_025", type: "kinematic", prompt: "Replace with the motion prompt for trial 025." },
  { id: "trial_026", type: "kinematic", prompt: "Replace with the motion prompt for trial 026." },
  { id: "trial_027", type: "kinematic", prompt: "Replace with the motion prompt for trial 027." },
  { id: "trial_028", type: "kinematic", prompt: "Replace with the motion prompt for trial 028." },
  { id: "trial_029", type: "kinematic", prompt: "Replace with the motion prompt for trial 029." },
  { id: "trial_030", type: "kinematic", prompt: "Replace with the motion prompt for trial 030." }
];

function configureTrial(trial) {
  return {
  ...trial,
  method1: `videos/${trial.id}_method1.mp4`,
  method2: `videos/${trial.id}_method2.mp4`,
  method1Name: "Pure KIMODO",
  method2Name: "Moa-KIMODO"
  };
}

const TEST_TRIALS = TRIAL_CONFIG.filter(trial => trial.id.startsWith("trial_test")).map(configureTrial);
const TRIALS = TRIAL_CONFIG.filter(trial => !trial.id.startsWith("trial_test")).map(configureTrial);

// Attention checks are separate from the 30 study trials.
// Replace these video paths with the attention-check videos.
const ATTENTION_CHECKS = [
  {
    id: "attention_001",
    type: "attention",
    method1: "videos/attention_001_method1.mp4",
    method2: "videos/attention_001_method2.mp4",
    method1Name: "Pure KIMODO",
    method2Name: "Moa-KIMODO",
    attention_check: true
  },
  {
    id: "attention_002",
    type: "attention",
    method1: "videos/attention_002_method1.mp4",
    method2: "videos/attention_002_method2.mp4",
    method1Name: "Pure KIMODO",
    method2Name: "Moa-KIMODO",
    attention_check: true
  }
];

// Comprehension checks look exactly like regular study trials. Each prompt and
// video pair must make the configured expected method unambiguously correct.
// Replace these placeholders and add the four corresponding video files.
const COMPREHENSION_CHECKS = [
  configureTrial({
    id: "comprehension_001",
    type: "sequence",
    prompt: "Replace with the motion prompt for comprehension check 001.",
    comprehension_check: true,
    expected_method: "method1"
  }),
  configureTrial({
    id: "comprehension_002",
    type: "kinematic",
    prompt: "Replace with the motion prompt for comprehension check 002.",
    comprehension_check: true,
    expected_method: "method2"
  })
];
