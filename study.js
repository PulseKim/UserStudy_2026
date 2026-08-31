"use strict";

const STUDY_TRIALS_PER_PARTICIPANT = 15;
const ATTENTION_CHECKS_PER_PARTICIPANT = 2;
const ATTENTION_PASS_THRESHOLD = 1.0;
const STORAGE_KEY = "motion-preference-study-session-v4";
const $ = selector => document.querySelector(selector);
const views = { landing: $("#landing-view"), study: $("#study-view"), completion: $("#completion-view") };
const consentCheckbox = $("#consent-checkbox"), startButton = $("#start-button");
const participantEmail = $("#participant-email"), registrationMessage = $("#registration-message");
const progress = $("#progress"), leftVideo = $("#left-video"), rightVideo = $("#right-video");
const trialPrompt = $("#trial-prompt");
const playBothButton = $("#play-both-button"), nextButton = $("#next-button");
const message = $("#study-message"), completionMessage = $("#completion-message");
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
  if (new Set([...TRIALS, ...ATTENTION_CHECKS].map(t => t.id)).size !== TRIALS.length + ATTENTION_CHECKS.length) throw new Error("Study and attention-check IDs must be unique.");
  const studyTrials = shuffle(TRIALS).slice(0, STUDY_TRIALS_PER_PARTICIPANT);
  const attentionTrials = shuffle(ATTENTION_CHECKS).slice(0, ATTENTION_CHECKS_PER_PARTICIPANT);
  const attentionInstructions = [
    { position: "left", prompt: "This is an attention test. Please select A for this question." },
    { position: "right", prompt: "This is an attention test. Please select B for this question." },
    { position: "none", prompt: "This is an attention test. Please select \"No preference\" for this question." }
  ];
  const selectedTrials = shuffle([...studyTrials, ...attentionTrials]).map((t, i) => {
    const firstLeft = Math.random() < .5;
    const attentionInstruction = t.attention_check
      ? attentionInstructions[Math.floor(Math.random() * attentionInstructions.length)]
      : null;
    return {
      trialId: t.id, trialOrder: i + 1, trialType: t.type,
      prompt: attentionInstruction ? attentionInstruction.prompt : t.prompt,
      isAttentionCheck: Boolean(t.attention_check),
      expectedAttentionResponse: attentionInstruction ? attentionInstruction.position : null,
      leftMethod: firstLeft ? t.method1Name : t.method2Name, rightMethod: firstLeft ? t.method2Name : t.method1Name,
      leftSrc: firstLeft ? t.method1 : t.method2, rightSrc: firstLeft ? t.method2 : t.method1
    };
  });
  return { participantId, studyStartTime: new Date().toISOString(), selectedTrials, currentIndex: 0,
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

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); }
  catch (error) { console.warn("Could not restore session", error); return null; }
}
function saveSession() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); }
function showView(name) { Object.entries(views).forEach(([key, node]) => { node.hidden = key !== name; }); }
function stopVideos() { leftVideo.pause(); rightVideo.pause(); }

function renderTrial() {
  const trial = session.selectedTrials[session.currentIndex];
  if (!trial) { finishStudy(); return; }
  stopVideos(); leftVideo.src = trial.leftSrc; rightVideo.src = trial.rightSrc; leftVideo.load(); rightVideo.load();
  progress.textContent = `Trial ${session.currentIndex + 1} / ${session.selectedTrials.length}`;
  trialPrompt.textContent = trial.prompt;
  message.textContent = "";
  responseInputs.forEach(input => { input.checked = input.value === session.currentSelection; });
  nextButton.disabled = !session.currentSelection;
  nextButton.textContent = session.currentIndex === session.selectedTrials.length - 1 ? "Submit" : "Next";
  showView("study");
}

function playBoth() {
  message.textContent = ""; stopVideos();
  try { leftVideo.currentTime = 0; rightVideo.currentTime = 0; }
  catch (_) { message.textContent = "The videos are still loading. Please try again."; return; }
  Promise.allSettled([leftVideo.play(), rightVideo.play()]).then(results => {
    if (results.some(r => r.status === "rejected")) { stopVideos(); message.textContent = "Playback could not start. Please press Play Both again."; }
  });
}

function recordAndAdvance() {
  if (!session.currentSelection) return;
  const t = session.selectedTrials[session.currentIndex], position = session.currentSelection;
  const preferred = position === "left" ? t.leftMethod : position === "right" ? t.rightMethod : "none";
  const correct = t.isAttentionCheck ? (t.expectedAttentionResponse === position || t.expectedAttentionResponse === preferred) : null;
  session.responses.push({ participant_id: session.participantId, trial_id: t.trialId, trial_order: t.trialOrder,
    trial_type: t.trialType, prompt: t.prompt, left_method: t.leftMethod, right_method: t.rightMethod,
    response_position: position, preferred_method: preferred, response_time_ms: Math.max(0, Date.now() - session.trialShownAt),
    is_attention_check: t.isAttentionCheck, attention_check_correct: correct, timestamp: new Date().toISOString() });
  session.currentIndex += 1; session.currentSelection = null; session.trialShownAt = Date.now(); saveSession(); renderTrial();
}

function buildPayload() {
  const checks = session.responses.filter(r => r.is_attention_check), correct = checks.filter(r => r.attention_check_correct).length;
  return { session: { participant_id: session.participantId, start_time: session.studyStartTime, end_time: session.studyEndTime,
    total_duration_ms: new Date(session.studyEndTime) - new Date(session.studyStartTime), number_of_trials: session.responses.length,
    number_of_attention_checks: checks.length, number_of_attention_checks_correct: correct,
    passed_attention_check: checks.length === 0 || correct / checks.length >= ATTENTION_PASS_THRESHOLD, completion_status: "complete" },
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
    const participantId = await emailToParticipantId(participantEmail.value.trim().toLowerCase());
    session = createSession(participantId);
    participantEmail.value = ""; saveSession(); renderTrial();
  } catch (error) {
    console.error(error); registrationMessage.textContent = "The study could not start. Please refresh the page and try again."; updateStartButton();
  }
});
playBothButton.addEventListener("click", playBoth); nextButton.addEventListener("click", recordAndAdvance);
responseInputs.forEach(input => input.addEventListener("change", () => { session.currentSelection = input.value; saveSession(); nextButton.disabled = false; }));
if (session?.status === "in_progress") renderTrial();
else if (session?.status === "complete") { if (session.submissionStatus === "submitting") session.submissionStatus = "failed"; finishStudy(); }
else showView("landing");
