// Replace every placeholder prompt with the instruction used to generate that trial's videos.
// Update each type to match the actual prompt: "sequence" or "kinematic".
const TRIAL_CONFIG = [
  { id: "trial_test01", type: "sequence", prompt: "This is a test prompt1." },
  { id: "trial_test02", type: "kinematic", prompt: "This is a test prompt2." },
  { id: "trial_001", type: "sequence", prompt: "A person rolls once and then runs forward." },
  { id: "trial_002", type: "sequence", prompt: "A person jumps 4 times." },
  { id: "trial_003", type: "sequence", prompt: "A person sits on the floor, rolls onto their back, and then sits up again." },
  { id: "trial_004", type: "sequence", prompt: "A person jumps high, retreats back, and then punches" },
  { id: "trial_005", type: "sequence", prompt: "A person does lunge and then does jumping jacks." },
  { id: "trial_006", type: "sequence", prompt: "A person punches head, chest and stomach" },
  { id: "trial_007", type: "sequence", prompt: "A person jumps twice and then runs forward." },
  { id: "trial_008", type: "sequence", prompt: "A person walks forward, turns around, and then runs back to the starting point." },
  { id: "trial_009", type: "sequence", prompt: "A person squats down, stands up, and then jumps." },
  { id: "trial_010", type: "sequence", prompt: "A person kicks forward with the left leg, then with the right leg, and then with the left leg again." },
  { id: "trial_011", type: "sequence", prompt: "A person runs forward, jumps, and then crouches down." },
  { id: "trial_012", type: "sequence", prompt: "A person takes three steps backward and then turns left." },
  { id: "trial_013", type: "sequence", prompt: "A person punches forward twice and then kicks forward once." },
  { id: "trial_014", type: "sequence", prompt: "A person kneels down, stands up, and then walks forward." },
  { id: "trial_015", type: "sequence", prompt: "A person kicks forward twice, squats down, and then stands up." },
  { id: "trial_016", type: "kinematic", prompt: "A person walks 2.0m forward." },
  { id: "trial_017", type: "kinematic", prompt: "A person dances while progressing 6.0m forward." },
  { id: "trial_018", type: "kinematic", prompt: "A person jogs 2.0m/s forward and stops when he reaches 4.0m." },
  { id: "trial_019", type: "kinematic", prompt: "A person crouches 2.0m backward while raising his right arm" },
  { id: "trial_020", type: "kinematic", prompt: "A person walks at 0.5m/s forward" },
  { id: "trial_021", type: "kinematic", prompt: "A person walks at 1.1m/s forward while raising his both arms high" },
  { id: "trial_022", type: "kinematic", prompt: "A person sidesteps 2.0 m to the left while facing forward." },
  { id: "trial_023", type: "kinematic", prompt: "A person walks backward at 0.8 m/s." },
  { id: "trial_024", type: "kinematic", prompt: "A person turns 90 degrees in place." },
  { id: "trial_025", type: "kinematic", prompt: "A person holds a ball with a radius of 0.4 m in front of their chest with both hands." },
  { id: "trial_026", type: "kinematic", prompt: "A person walks 3.0 m forward while keeping both hands at least 0.2 m above their head." },
  { id: "trial_027", type: "kinematic", prompt: "A person walks forward, steps over an obstacle 0.3 m high, and continues walking forward." },
  { id: "trial_028", type: "kinematic", prompt: "A person crouches and walks forward under a horizontal bar that is 1.2 m above the floor." },
  { id: "trial_029", type: "kinematic", prompt: "A person stands with their feet 0.8 m apart while extending both arms sideways." },
  { id: "trial_030", type: "kinematic", prompt: "A person reaches forward with their right hand to touch a target 0.5 m in front of their chest." }
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

// Comprehension checks double as the instructions and are always shown first, in this order,
// with fixed video positions (not randomized). Videos: comprehension_00N_method1.mp4 is shown
// as A, comprehension_00N_method2.mp4 as B. expected_method is the method whose video is the
// correct (more generous) answer; hint is shown in the popup after a wrong answer.
const COMPREHENSION_CHECKS = [
  configureTrial({
    id: "comprehension_001",
    type: "kinematic",
    prompt: "A person walks at 1.0m/s forward",
    comprehension_check: true,
    expected_method: "method2",   // correct answer: B
    hint: "Read the sentence carefully. B moves at almost 1 m/s, but A does not move at all."
  }),
  configureTrial({
    id: "comprehension_002",
    type: "kinematic",
    prompt: "A person jumps at 0.3m high.",
    comprehension_check: true,
    expected_method: "method1",   // correct answer: A
    hint: "Of course, A cannot jump 0.3 m either, but it matches the prompt better than B. Please be generous like this when choosing: pick the one that is closer to the prompt."
  }),
  configureTrial({
    id: "comprehension_003",
    type: "sequence",
    prompt: "A person jumps, kicks and then walks.",
    comprehension_check: true,
    expected_method: "method2",   // correct answer: B (A = "jumps and walks", no kick)
    hint: "For a sequence, check whether every action happens, in order: jump, kick, and then walk. B does all three; A never kicks."
  })
];
