const regions = {
  kanto: [1, 151],
  johto: [152, 251],
  hoenn: [252, 386],
  sinnoh: [387, 493],
  unova: [494, 649],
  kalos: [650, 721],
  alola: [722, 809],
  galar: [810, 905],
  paldea: [906, 1025]
};

let quizData = {};
let currentQuiz = [];
let currentIndex = 0;
let answers = [];
let currentRegion = "";
let isFinished = false;

/* 初期化 */
async function init() {
  const cached = localStorage.getItem("pokemonData");

  if (cached) {
    quizData = JSON.parse(cached);
    document.getElementById("loading").style.display = "none";
    return;
  }

  for (const r in regions) {
    const [s, e] = regions[r];
    quizData[r] = await loadPokemonRange(s, e);
  }

  localStorage.setItem("pokemonData", JSON.stringify(quizData));
  document.getElementById("loading").style.display = "none";
}

/* データ取得 */
async function loadPokemonRange(start, end) {
  const list = [];
  for (let i = start; i <= end; i++) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
    const data = await res.json();

    const res2 = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${i}`);
    const data2 = await res2.json();
    const ja = data2.names.find(n => n.language.name === "ja");

    list.push({
      name: ja.name,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`
    });
  }
  return list;
}

/* 開始 */
function startQuiz(region) {
  currentRegion = region;
  currentQuiz = [...quizData[region]].sort(() => Math.random() - 0.5);

  answers = new Array(currentQuiz.length).fill(null).map(() => ({
    result: null,
    input: "",
    marked: false
  }));

  currentIndex = 0;
  isFinished = false;

  document.getElementById("quiz-area").style.display = "block";
  hideButtons();

  renderQuestion();
  renderNav();
}

/* 表示 */
function renderQuestion() {
  const data = currentQuiz[currentIndex];
  const saved = answers[currentIndex];

  document.getElementById("pokemon-image").src = data.image;

  const input = document.getElementById("answer");
  const resultBox = document.getElementById("answer-result");

  input.value = saved.input || "";

  if (isFinished) {
    input.style.display = "none";

    resultBox.style.display = "block";
    resultBox.innerHTML = `
      あなたの回答: ${saved.input || "未回答"}<br>
      正解: ${data.name}<br>
      ${saved.result ? "⭕ 正解" : "❌ 不正解"}
    `;
  } else {
    input.style.display = "inline-block";
    resultBox.style.display = "none";
    input.focus();
  }

  updateMarkButton();
}

/* 回答 */
function submitAnswer() {
  if (isFinished) return;

  const input = document.getElementById("answer").value;
  const correct = currentQuiz[currentIndex].name;

  answers[currentIndex].input = input;
  answers[currentIndex].result =
    input === "" ? null : (input === correct);

  renderNav();
  nextQuestion();
}

/* 入力時リアルタイム更新（バグ修正の核🔥） */
document.addEventListener("DOMContentLoaded", () => {
  init();

  const input = document.getElementById("answer");

  input.addEventListener("input", e => {
    const val = e.target.value;
    const correct = currentQuiz[currentIndex]?.name;

    if (!answers[currentIndex]) return;

    answers[currentIndex].input = val;
    answers[currentIndex].result =
      val === "" ? null : (val === correct);

    renderNav();
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAnswer();
    }
  });
});

/* 移動 */
function nextQuestion() {
  if (currentIndex < currentQuiz.length - 1) {
    currentIndex++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}

/* マーク */
function toggleMark() {
  answers[currentIndex].marked = !answers[currentIndex].marked;
  updateMarkButton();
  renderNav();
}

function updateMarkButton() {
  const btn = document.getElementById("mark-btn");
  btn.textContent = answers[currentIndex].marked
    ? "マーキング中"
    : "マーキング";
}

/* ナビ */
function renderNav() {
  const nav = document.getElementById("question-nav");
  nav.innerHTML = "";

  answers.forEach((ans, i) => {
    const btn = document.createElement("button");
    btn.innerText = i + 1;

    if (ans.marked) {
      btn.classList.add("marked");
    } else if (isFinished) {
      // 採点後
      if (ans.result === true) btn.classList.add("correct");
      else btn.classList.add("wrong");
    } else {
      // 回答中
      if (!ans.input) {
        btn.classList.add("unanswered"); // 白
      } else {
        btn.classList.add("answered"); // 入力済み（新規）
      }
    }

    btn.onclick = () => {
      currentIndex = i;
      renderQuestion();
    };

    nav.appendChild(btn);
  });
}

/* 終了 */
function finishQuiz() {
  if (!confirm("終了して採点する？")) return;

  // 🔥 全問題をここで判定
  answers.forEach((ans, i) => {
    const correct = currentQuiz[i].name;

    if (ans.input === "") {
      ans.result = null;
    } else {
      ans.result = (ans.input === correct);
    }
  });

  isFinished = true;

  renderNav();
  showResult();

  document.getElementById("retry-wrong-btn").style.display = "block";
  document.getElementById("restart-btn").style.display = "block";
}

/* 結果 */
function showResult() {
  const correct = answers.filter(a => a.result).length;
  const rate = Math.round((correct / answers.length) * 100);

  document.getElementById("result").innerText =
    `正答率: ${rate}% (${correct}/${answers.length})`;
}

/* リトライ */
function retryWrong() {
  const wrongIndexes = answers
    .map((a, i) => (a.result !== true ? i : -1))
    .filter(i => i !== -1);

  if (wrongIndexes.length === 0) {
    alert("全問正解！");
    return;
  }

  currentQuiz = wrongIndexes.map(i => currentQuiz[i]);

  answers = new Array(currentQuiz.length).fill(null).map(() => ({
    result: null,
    input: "",
    marked: false
  }));

  currentIndex = 0;
  isFinished = false;

  hideButtons();
  renderQuestion();
  renderNav();
}

/* リスタート */
function restartQuiz() {
  startQuiz(currentRegion);
}

/* ボタン制御 */
function hideButtons() {
  document.getElementById("retry-wrong-btn").style.display = "none";
  document.getElementById("restart-btn").style.display = "none";
}