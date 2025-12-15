// DOM elements - candidate & sets
const loadingMessage = document.getElementById("loading-message");
const candidateSection = document.getElementById("candidate-section");
const candidateNameInput = document.getElementById("candidate-name");
const candidateIdInput = document.getElementById("candidate-id");
const setsListEl = document.getElementById("sets-list");
const setsCountEl = document.getElementById("sets-count");
const candidateError = document.getElementById("candidate-error");
const startTestBtn = document.getElementById("start-test-btn");

// DOM elements - quiz
const quizSection = document.getElementById("quiz-section");
const questionCounterEl = document.getElementById("question-counter");
const candidateDisplayEl = document.getElementById("candidate-display");
const questionTextEl = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const submitBtn = document.getElementById("submit-btn");

// DOM elements - result & history
const resultSection = document.getElementById("result-section");
const scoreSummaryEl = document.getElementById("score-summary");
const resultCandidateEl = document.getElementById("result-candidate");
const detailedFeedbackEl = document.getElementById("detailed-feedback");
const retryBtn = document.getElementById("retry-btn");
const exportResultsBtn = document.getElementById("export-results-btn");

const historyContainer = document.getElementById("history-container");

// Data
let allSets = [];           // [{id, title, questions}]
let selectedSet = null;     // currently chosen set
let selectedSetId = null;

let questions = [];         // questions of the selected set
let currentIndex = 0;
let userAnswers = [];       // [index or null] per question

let candidateName = "";
let candidateId = "";

let testStartTime = null;

// ---- Load sets + questions on page load ----
fetch("questions.json")
  .then((res) => res.json())
  .then((data) => {
    allSets = data.sets || [];
    if (!allSets.length) {
      loadingMessage.textContent = "No test sets found in questions.json.";
      return;
    }

    // Newest last in JSON => reverse so newest appears first
    allSets = allSets.slice().reverse();

    populateSetsList(allSets);
    setsCountEl.textContent = `${allSets.length} set(s)`;
    loadingMessage.textContent = `Loaded ${allSets.length} test set(s). Select one to start.`;
    updateStartButtonState();
    loadHistory();
  })
  .catch((err) => {
    console.error("Error loading questions.json", err);
    loadingMessage.textContent =
      "Failed to load sets. Please check questions.json.";
  });

// ---- Populate sets UI ----
function populateSetsList(sets) {
  setsListEl.innerHTML = "";
  sets.forEach((set, index) => {
    const card = document.createElement("div");
    card.className = "set-card";
    card.dataset.setId = set.id;

    const title = set.title || `Set ${index + 1}`;
    const totalQuestions = (set.questions || []).length;

    const titleEl = document.createElement("div");
    titleEl.className = "set-card-title";
    titleEl.textContent = title;

    const metaEl = document.createElement("div");
    metaEl.className = "set-card-meta";
    metaEl.textContent = `${totalQuestions} question(s)`;

    const badgeEl = document.createElement("div");
    badgeEl.className = "set-card-badge";
    // For daily sets, index 0 = latest
    badgeEl.textContent = index === 0 ? "Latest" : `Set #${sets.length - index}`;

    card.appendChild(titleEl);
    card.appendChild(metaEl);
    card.appendChild(badgeEl);

    card.addEventListener("click", () => {
      selectSetCard(set.id);
    });

    setsListEl.appendChild(card);
  });
}

// ---- Handle set selection ----
function selectSetCard(setId) {
  selectedSetId = setId;

  // Highlight selected card
  document.querySelectorAll(".set-card").forEach((card) => {
    if (card.dataset.setId === setId) {
      card.classList.add("selected");
      // Smooth scroll this card into view in mobile horizontal strip
      card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    } else {
      card.classList.remove("selected");
    }
  });

  updateStartButtonState();
}

// ---- Start button enabled when name + set chosen ----
function updateStartButtonState() {
  if (quizSection && !quizSection.classList.contains("hidden")) {
    startTestBtn.disabled = true;
    return;
  }

  const name = candidateNameInput.value.trim();
  const hasSet = !!selectedSetId;
  const setsLoaded = allSets.length > 0;
  startTestBtn.disabled = !name || !hasSet || !setsLoaded;
}

candidateNameInput.addEventListener("input", updateStartButtonState);

// ---- Candidate start ----
startTestBtn.addEventListener("click", () => {
  const name = candidateNameInput.value.trim();
  const id = candidateIdInput.value.trim();

  if (!name) {
    candidateError.textContent = "Name is required to start the test.";
    candidateError.classList.remove("hidden");
    return;
  }

  if (!selectedSetId) {
    candidateError.textContent = "Please select a test set.";
    candidateError.classList.remove("hidden");
    return;
  }

  testStartTime = new Date().toISOString();

  const set = allSets.find((s) => s.id === selectedSetId);
  if (!set) {
    candidateError.textContent = "Selected test set not found.";
    candidateError.classList.remove("hidden");
    return;
  }

  if (!set.questions || !set.questions.length) {
    candidateError.textContent =
      "The selected test set has no questions.";
    candidateError.classList.remove("hidden");
    return;
  }

  candidateError.classList.add("hidden");

  candidateName = name;
  candidateId = id;
  selectedSet = set;
  questions = selectedSet.questions;
  userAnswers = new Array(questions.length).fill(null);
  currentIndex = 0;

  const title = selectedSet.title || selectedSet.id || "Selected Set";

  candidateDisplayEl.textContent = `Candidate: ${candidateName}${candidateId ? " (" + candidateId + ")" : ""
    } • Test: ${title}`;

  quizSection.classList.remove("hidden");
  renderQuestion();
  updateNavButtons();

  quizSection.scrollIntoView({ behavior: "smooth" });
  
  startTestBtn.disabled = true;

});

// ---- Render quiz question ----
function renderQuestion() {
  if (!questions.length) return;
  const q = questions[currentIndex];

  questionCounterEl.textContent = `Question ${currentIndex + 1} of ${questions.length
    }`;
  questionTextEl.textContent = q.question;

  optionsContainer.innerHTML = "";
  q.options.forEach((optText, idx) => {
    const optionDiv = document.createElement("label");
    optionDiv.className = "option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "option";
    input.value = idx;

    if (userAnswers[currentIndex] === idx) {
      input.checked = true;
      optionDiv.classList.add("selected");
    }

    input.addEventListener("change", () => {
      userAnswers[currentIndex] = idx;
      document
        .querySelectorAll(".option")
        .forEach((opt) => opt.classList.remove("selected"));
      optionDiv.classList.add("selected");
      updateSubmitButtonState();
    });

    const span = document.createElement("span");
    span.className = "option-label";
    span.textContent = optText;

    optionDiv.appendChild(input);
    optionDiv.appendChild(span);
    optionsContainer.appendChild(optionDiv);
  });

  updateSubmitButtonState();
}

// ---- Navigation ----
prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
    updateNavButtons();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
    updateNavButtons();
  }
});

function updateNavButtons() {
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === questions.length - 1;
}

function updateSubmitButtonState() {
  // const allAnswered = userAnswers.every((ans) => ans !== null);
  submitBtn.disabled = false; // Allow submission even if not all answered
}

// ---- Submit & scoring ----
submitBtn.addEventListener("click", () => {
  const totalQuestions = questions.length;
  let correctCount = 0;
  let attemptedCount = 0;
  const questionResults = [];

  questions.forEach((q, idx) => {
    const selectedIndex = userAnswers[idx];
    const attempted = selectedIndex !== null;
    const isCorrect = attempted && selectedIndex === q.answerIndex;

    if (attempted) attemptedCount++;
    if (isCorrect) correctCount++;

    questionResults.push({
      id: q.id,
      question: q.question,
      selectedIndex,
      correctIndex: q.answerIndex
    });
  });

  const percentage =
    attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

  const timestamp = new Date().toISOString();

  const resultObject = {
    timestamp,
    startTime: testStartTime,   // ✅ NEW
    candidateName,
    candidateId,
    setId: selectedSet.id,
    setTitle: selectedSet.title || selectedSet.id,
    totalQuestions,
    attempted: attemptedCount,
    correct: correctCount,
    percentage: Number(percentage.toFixed(2)),
    details: questionResults
  };

  saveResultToHistory(resultObject);
  showResult(resultObject);
  loadHistory();
});

function showResult(result) {
  const { totalQuestions, correct, attempted, percentage, details } = result;

  scoreSummaryEl.textContent =
    `Attempted: ${attempted}/${totalQuestions} • ` +
    `Correct: ${correct} (${percentage}%)`;

  resultCandidateEl.textContent = `Candidate: ${result.candidateName}${result.candidateId ? " (" + result.candidateId + ")" : ""
    } • Test: ${result.setTitle}`;
  
  const start = new Date(result.startTime).toLocaleString();
  const end = new Date(result.timestamp).toLocaleString();

  const timeInfo = document.createElement("p");
  timeInfo.className = "muted small";
  timeInfo.textContent = `Started: ${start} • Submitted: ${end}`;
  resultCandidateEl.after(timeInfo);


  detailedFeedbackEl.innerHTML = "";
  details.forEach((d, idx) => {
    const item = document.createElement("div");
    const isCorrect = d.selectedIndex === d.correctIndex;
    item.className =
      "feedback-item " + (isCorrect ? "correct" : "incorrect");

    const titleEl = document.createElement("h3");
    titleEl.textContent = `Q${idx + 1}. ${d.question}`;
    item.appendChild(titleEl);

    const yourAnswerP = document.createElement("p");
    const yourAnswerText =
      d.selectedIndex !== null
        ? questions[idx].options[d.selectedIndex]
        : "Not answered";
    yourAnswerP.textContent = "Your answer: " + yourAnswerText;
    item.appendChild(yourAnswerP);

    const correctAnswerP = document.createElement("p");
    correctAnswerP.textContent =
      "Correct answer: " + questions[idx].options[d.correctIndex];
    item.appendChild(correctAnswerP);

    detailedFeedbackEl.appendChild(item);
  });

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
}


// ---- History in localStorage ----
const STORAGE_KEY = "examResults";

function getHistory() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveResultToHistory(result) {
  const history = getHistory();
  history.push(result);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
  const history = getHistory();
  if (!history.length) {
    historyContainer.innerHTML =
      '<p class="muted">No attempts recorded yet.</p>';
    return;
  }

  const table = document.createElement("table");
  table.className = "history-table";

  const thead = document.createElement("thead");
  thead.innerHTML = `
  <tr>
    <th>#</th>
    <th>Started At</th>
    <th>Date & Time</th>
    <th>Name</th>
    <th>ID</th>
    <th>Test Set</th>
    <th>Score</th>
    <th>%</th>
    <th>Attempted</th>
    <th>Questions</th>
  </tr>
`;

  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  history.forEach((r, idx) => {
    const tr = document.createElement("tr");

    const attemptTd = document.createElement("td");
    attemptTd.textContent = idx + 1;

    const startTd = document.createElement("td");
    startTd.textContent = r.startTime
      ? new Date(r.startTime).toLocaleString()
      : "-";

    const dateTd = document.createElement("td");
    const date = new Date(r.timestamp);
    dateTd.textContent = date.toLocaleString();

    const nameTd = document.createElement("td");
    nameTd.textContent = r.candidateName || "-";

    const idTd = document.createElement("td");
    idTd.textContent = r.candidateId || "-";

    const setTd = document.createElement("td");
    setTd.textContent = r.setTitle || r.setId || "-";

    const scoreTd = document.createElement("td");
    const attempted = typeof r.attempted === "number"
      ? r.attempted
      : r.totalQuestions; // fallback for old records
    scoreTd.textContent = `${r.correct}/${attempted}`;

    const percTd = document.createElement("td");
    percTd.textContent = `${r.percentage}%`;

    const attemptedTd = document.createElement("td");
    attemptedTd.textContent =
      typeof r.attempted === "number" ? r.attempted : r.totalQuestions;

    const qTd = document.createElement("td");
    qTd.textContent = r.totalQuestions;

    tr.appendChild(attemptTd);
    tr.appendChild(startTd);
    tr.appendChild(dateTd);
    tr.appendChild(nameTd);
    tr.appendChild(idTd);
    tr.appendChild(setTd);
    tr.appendChild(scoreTd);
    tr.appendChild(percTd);
    tr.appendChild(attemptedTd);
    tr.appendChild(qTd);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  historyContainer.innerHTML = "";
  historyContainer.appendChild(table);
}

// ---- Retry ----
retryBtn.addEventListener("click", () => {
  if (!selectedSet) return;
  questions = selectedSet.questions;
  userAnswers = new Array(questions.length).fill(null);
  currentIndex = 0;
  startTestBtn.disabled = true;
  testStartTime = new Date().toISOString();
  renderQuestion();
  updateNavButtons();
  resultSection.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---- Export results as JSON file ----
exportResultsBtn.addEventListener("click", async () => {
  const history = getHistory();
  const jsonText = JSON.stringify(history, null, 2);

  // Short readable summary (safe for WhatsApp/SMS)
  const summary = history
    .slice(-1)
    .map(r =>
      `Practice Exam Result
Name: ${r.candidateName}
Test: ${r.setTitle}
Score: ${r.correct}/${r.attempted}
Percentage: ${r.percentage}%
Date: ${new Date(r.timestamp).toLocaleString()}`
    )[0];

  // 1️⃣ Try sharing summary text
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Practice Exam Result",
        text: summary
      });
      return;
    } catch (err) {
      // user cancel OR app rejected
      console.warn("Text share cancelled or rejected");
    }
  }

  // 2️⃣ Copy full JSON to clipboard
  try {
    await navigator.clipboard.writeText(jsonText);
    alert("Full JSON copied to clipboard. You can paste it anywhere.");
  } catch {
    alert("Sharing is not supported on this device.");
  }
});
