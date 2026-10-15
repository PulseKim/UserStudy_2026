"use strict";

const STUDY_TRIALS_PER_PARTICIPANT = 15;
const ATTENTION_CHECKS_PER_PARTICIPANT = 2;
const COMPREHENSION_CHECKS_PER_PARTICIPANT = 2;
const ATTENTION_PASS_THRESHOLD = 1.0;
const TEST_MODE = new URLSearchParams(window.location.search).get("test") === "1";
// v7: forced choice (A/B only); older saved sessions may contain "No preference" checks, so they are not resumed.
const STORAGE_KEY = TEST_MODE ? "motion-preference-study-session-v7-test" : "motion-preference-study-session-v7";
const $ = selector => document.querySelector(selector);
const views = { landing: $("#landing-view"), study: $("#study-view"), completion: $("#completion-view") };
const consentCheckbox = $("#consent-checkbox"), startButton = $("#start-button");
const participantEmail = $("#participant-email"), registrationMessage = $("#registration-message");
const progress = $("#progress"), leftVideo = $("#left-video"), rightVideo = $("#right-video");
const trialPrompt = $("#trial-prompt");
const playAButton = $("#play-a-button"), playBothButton = $("#play-both-button"), playBButton = $("#play-b-button"), nextButton = $("#next-button");
const message = $("#study-message"), completionMessage = $("#completion-message");
const practiceBanner = $("#practice-banner"), instructionModal = $("#instruction-modal"), instructionModalClose = $("#instruction-modal-close");
const instructionModalBody = $("#instruction-modal-body");
const responseInputs = [...document.querySelectorAll('input[name="response"]')];
let session = loadSession();

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createSession(participantId) {
  if (!Array.isArray(TRIALS) || TRIALS.length < STUDY_TRIALS_PER_PARTICIPANT) throw new Error(`Configure at least ${STUDY_TRIALS_PER_PARTICIPANT} study trials.`);
  if (new Set(TRIALS.map(t => t.id)).size !== TRIALS.length) throw new Error("Trial IDs must be unique.");
  if (TRIALS.some(t => !["sequence", "kinematic"].includes(t.type))) throw new Error('Every trial type must be "sequence" or "kinematic".');
  if (TRIALS.some(t => typeof t.prompt !== "string" || !t.prompt.trim())) throw new Error("Every trial must have a motion prompt.");
  if (!Array.isArray(ATTENTION_CHECKS) || ATTENTION_CHECKS.length < ATTENTION_CHECKS_PER_PARTICIPANT) throw new Error(`Configure at least ${ATTENTION_CHECKS_PER_PARTICIPANT} attention checks.`);
  if (!Array.isArray(COMPREHENSION_CHECKS) || COMPREHENSION_CHECKS.length < COMPREHENSION_CHECKS_PER_PARTICIPANT) throw new Error(`Configure at least ${COMPREHENSION_CHECKS_PER_PARTICIPANT} comprehension checks.`);
  if (COMPREHENSION_CHECKS.some(t => !["sequence", "kinematic"].includes(t.type) || typeof t.prompt !== "string" || !t.prompt.trim())) throw new Error("Every comprehension check must look like a regular study trial.");
  if (COMPREHENSION_CHECKS.some(t => !["method1", "method2"].includes(t.expected_method))) throw new Error('Every comprehension check must set expected_method to "method1" or "method2".');
  if (!Array.isArray(TEST_TRIALS) || TEST_TRIALS.length !== 2) throw new Error("Configure exactly two test trials.");
  const allTrials = [...TRIALS, ...ATTENTION_CHECKS, ...COMPREHENSION_CHECKS];
  if (new Set(allTrials.map(t => t.id)).size !== allTrials.length) throw new Error("Study and quality-check IDs must be unique.");
  const studyTrials = TEST_MODE ? TEST_TRIALS : shuffle(TRIALS).slice(0, STUDY_TRIALS_PER_PARTICIPANT);
  const attentionTrials = TEST_MODE
    ? shuffle(ATTENTION_CHECKS).slice(0, 1)
    : shuffle(ATTENTION_CHECKS).slice(0, ATTENTION_CHECKS_PER_PARTICIPANT);
  // Comprehension checks are fixed: always first, in the configured order.
  const comprehensionTrials = COMPREHENSION_CHECKS.slice(0, TEST_MODE ? 1 : COMPREHENSION_CHECKS_PER_PARTICIPANT);
  const attentionInstructions = [
    { position: "left", prompt: "This is an attention test. Please select A for this question." },
    { position: "right", prompt: "This is an attention test. Please select B for this question." }
  ];
  const selectedTrials = [...comprehensionTrials, ...shuffle([...studyTrials, ...attentionTrials])].map((t, i) => {
    const firstLeft = t.comprehension_check ? true : Math.random() < .5;
    const attentionInstruction = t.attention_check
      ? attentionInstructions[Math.floor(Math.random() * attentionInstructions.length)]
      : null;
    return {
      trialId: t.id, trialOrder: i + 1, trialType: t.type,
      prompt: attentionInstruction ? attentionInstruction.prompt : t.prompt,
      isAttentionCheck: Boolean(t.attention_check),
      expectedAttentionResponse: attentionInstruction ? attentionInstruction.position : null,
      isComprehensionCheck: Boolean(t.comprehension_check), comprehensionRetried: false, comprehensionHint: t.hint || "",
      expectedComprehensionMethod: t.expected_method === "method1" ? t.method1Name
        : t.expected_method === "method2" ? t.method2Name : t.expected_method,
      leftMethod: firstLeft ? t.method1Name : t.method2Name, rightMethod: firstLeft ? t.method2Name : t.method1Name,
      leftSrc: firstLeft ? t.method1 : t.method2, rightSrc: firstLeft ? t.method2 : t.method1
    };
  });
  return { participantId, isTest: TEST_MODE, studyStartTime: new Date().toISOString(), selectedTrials, currentIndex: 0,
    responses: [], currentSelection: null, trialShownAt: Date.now(), status: "in_progress", submissionStatus: "not_submitted" };
}

async function emailToParticipantId(email) {
  const bytes = new TextEncoder().encode(email);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const idBytes = new Uint8Array(digest).slice(0, 16);
  idBytes[6] = (idBytes[6] & 0x0f) | 0x80;
  idBytes[8] = (idBytes[8] & 0x3f) | 0x80;
  const hex = [...idBytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function randomParticipantId() {
  return crypto.randomUUID();
}

function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (!saved) return null;
    const availableTrials = TEST_MODE
      ? [...TEST_TRIALS, ...ATTENTION_CHECKS, ...COMPREHENSION_CHECKS]
      : [...TRIALS, ...ATTENTION_CHECKS, ...COMPREHENSION_CHECKS];
    const availableIds = new Set(availableTrials.map(trial => trial.id));
    const isCompatible = Array.isArray(saved.selectedTrials)
      && saved.selectedTrials.every(trial => availableIds.has(trial.trialId));
    if (!isCompatible) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return saved;
  }
  catch (error) { console.warn("Could not restore session", error); return null; }
}
function saveSession() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }
function showView(name) { Object.entries(views).forEach(([key, node]) => { node.hidden = key !== name; }); }
function stopVideos() { leftVideo.pause(); rightVideo.pause(); }

function updateVideoSelection(position) {
  leftVideo.closest(".video-card").classList.toggle("selected", position === "left");
  rightVideo.closest(".video-card").classList.toggle("selected", position === "right");
}

function renderTrial() {
  const trial = session.selectedTrials[session.currentIndex];
  if (!trial) { finishStudy(); return; }
  stopVideos(); leftVideo.src = trial.leftSrc; rightVideo.src = trial.rightSrc; leftVideo.load(); rightVideo.load();
  progress.textContent = `Trial ${session.currentIndex + 1} / ${session.selectedTrials.length}`;
  trialPrompt.textContent = trial.prompt;
  practiceBanner.hidden = !trial.isComprehensionCheck;
  message.textContent = "";
  responseInputs.forEach(input => { input.checked = input.value === session.currentSelection; });
  updateVideoSelection(session.currentSelection);
  nextButton.disabled = !session.currentSelection;
  nextButton.textContent = session.currentIndex === session.selectedTrials.length - 1 ? "Submit" : "Next";
  showView("study");
  playBoth({ silent: true });
}

function playBoth({ silent = false } = {}) {
  message.textContent = ""; stopVideos();
  try { leftVideo.currentTime = 0; rightVideo.currentTime = 0; }
  catch (_) {
    if (!silent) message.textContent = "The videos are still loading. Please try again.";
    return;
  }
  Promise.allSettled([leftVideo.play(), rightVideo.play()]).then(results => {
    if (results.some(r => r.status === "rejected")) {
      stopVideos();
      if (!silent) message.textContent = "Playback could not start. Please press Play Both again.";
    }
  });
}

function playOne(video) {
  message.textContent = "";
  stopVideos();
  try { video.currentTime = 0; }
  catch (_) { message.textContent = "The video is still loading. Please try again."; return; }
  video.play().catch(() => {
    message.textContent = "Playback could not start. Please try again.";
  });
}

function recordAndAdvance() {
  if (!session.currentSelection) return;
  const t = session.selectedTrials[session.currentIndex], position = session.currentSelection;
  const preferred = position === "left" ? t.leftMethod : t.rightMethod;
  if (t.isComprehensionCheck && t.expectedComprehensionMethod !== preferred) {
    // Wrong answer on a comprehension question: show the instructions and block progress until it is answered correctly.
    t.comprehensionRetried = true;
    session.currentSelection = null; saveSession();
    responseInputs.forEach(input => { input.checked = false; });
    updateVideoSelection(null); nextButton.disabled = true;
    instructionModalBody.textContent = t.comprehensionHint
      || "That answer does not match what the videos show. One of the two videos clearly matches the prompt better than the other.";
    instructionModal.hidden = false; instructionModalClose.focus();
    return;
  }
  const attentionCorrect = t.isAttentionCheck ? (t.expectedAttentionResponse === position || t.expectedAttentionResponse === preferred) : null;
  const comprehensionCorrect = t.isComprehensionCheck ? (t.expectedComprehensionMethod === preferred && !t.comprehensionRetried) : null;
  session.responses.push({ participant_id: session.participantId, trial_id: t.trialId, trial_order: t.trialOrder,
    trial_type: t.trialType, prompt: t.prompt, left_method: t.leftMethod, right_method: t.rightMethod,
    response_position: position, preferred_method: preferred, response_time_ms: Math.max(0, Date.now() - session.trialShownAt),
    is_attention_check: t.isAttentionCheck, attention_check_correct: attentionCorrect,
    is_comprehension_check: t.isComprehensionCheck, comprehension_check_correct: comprehensionCorrect,
    timestamp: new Date().toISOString() });
  session.currentIndex += 1; session.currentSelection = null; session.trialShownAt = Date.now(); saveSession(); renderTrial();
}

function buildPayload() {
  const checks = session.responses.filter(r => r.is_attention_check), correct = checks.filter(r => r.attention_check_correct).length;
  const comprehensionChecks = session.responses.filter(r => r.is_comprehension_check);
  const correctComprehensionChecks = comprehensionChecks.filter(r => r.comprehension_check_correct).length;
  return { session: { participant_id: session.participantId, start_time: session.studyStartTime, end_time: session.studyEndTime,
    total_duration_ms: new Date(session.studyEndTime) - new Date(session.studyStartTime), number_of_trials: session.responses.length,
    number_of_attention_checks: checks.length, number_of_attention_checks_correct: correct,
    passed_attention_check: checks.length > 0 && correct / checks.length >= ATTENTION_PASS_THRESHOLD,
    number_of_comprehension_checks: comprehensionChecks.length,
    number_of_comprehension_checks_correct: correctComprehensionChecks,
    passed_comprehension_check: comprehensionChecks.length > 0 && correctComprehensionChecks === comprehensionChecks.length,
    completion_status: "complete", is_test: Boolean(session.isTest) },
    responses: session.responses };
}

async function submitPayload(payload) {
  const c = window.STUDY_CONFIG || {};
  if (!c.supabaseUrl || !c.supabaseAnonKey || c.supabaseUrl.includes("YOUR_PROJECT")) { console.log("Local-test result:", payload); return true; }
  const response = await fetch(`${c.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/submit_study`, { method: "POST",
    headers: { "Content-Type": "application/json", apikey: c.supabaseAnonKey, Authorization: `Bearer ${c.supabaseAnonKey}` }, body: JSON.stringify({ payload }) });
  if (!response.ok) throw new Error(`Submission failed (${response.status}): ${await response.text()}`);
  return false;
}

async function finishStudy() {
  stopVideos(); showView("completion");
  if (session.status === "complete" && session.submissionStatus === "submitted") return;
  if (!session.studyEndTime) session.studyEndTime = new Date().toISOString();
  session.status = "complete"; session.submissionStatus = "submitting"; saveSession(); completionMessage.textContent = "Submitting your responses…";
  try { const local = await submitPayload(buildPayload()); session.submissionStatus = "submitted"; saveSession();
    completionMessage.textContent = local ? "Thank you. Your responses have been recorded (local test mode)." : "Thank you. Your responses have been recorded.";
  } catch (error) { console.error(error); session.submissionStatus = "failed"; saveSession();
    completionMessage.textContent = "Your responses could not be submitted. Check your connection and reload this page to retry."; }
}

function updateStartButton() {
  startButton.disabled = !consentCheckbox.checked || !participantEmail.validity.valid;
}
consentCheckbox.addEventListener("change", updateStartButton);
participantEmail.addEventListener("input", updateStartButton);
startButton.addEventListener("click", async () => {
  if (startButton.disabled) return;
  startButton.disabled = true; registrationMessage.textContent = "Creating your pseudonymous participant ID…";
  try {
    const participantId = TEST_MODE
      ? randomParticipantId()
      : await emailToParticipantId(participantEmail.value.trim().toLowerCase());
    session = createSession(participantId);
    participantEmail.value = ""; saveSession(); renderTrial();
  } catch (error) {
    console.error(error); registrationMessage.textContent = "The study could not start. Please refresh the page and try again."; updateStartButton();
  }
});
playAButton.addEventListener("click", () => playOne(leftVideo));
playBothButton.addEventListener("click", playBoth);
playBButton.addEventListener("click", () => playOne(rightVideo));
nextButton.addEventListener("click", recordAndAdvance);
instructionModalClose.addEventListener("click", () => { instructionModal.hidden = true; });
responseInputs.forEach(input => input.addEventListener("change", () => {
  session.currentSelection = input.value;
  updateVideoSelection(input.value);
  saveSession();
  nextButton.disabled = false;
}));
if (session?.status === "in_progress") renderTrial();
else if (session?.status === "complete") { if (session.submissionStatus === "submitting") session.submissionStatus = "failed"; finishStudy(); }
else showView("landing");
