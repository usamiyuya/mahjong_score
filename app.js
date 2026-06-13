// -------------------------
// タブ切り替え
// -------------------------
const tabButtons = document.querySelectorAll(".bottom-nav button");
const tabPages = document.querySelectorAll(".tab-page");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;

    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    tabPages.forEach(page => {
      page.classList.remove("active");
      if (page.id === target) page.classList.add("active");
    });
  });
});

// -------------------------
// localStorage
// -------------------------
const STORAGE_KEY = "mahjong_records";

function loadRecords() {
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

let records = loadRecords();

// -------------------------
// 一覧表示
// -------------------------
function renderRecordList() {
  const container = document.getElementById("record-list");
  container.innerHTML = "";

  records.slice().reverse().forEach(record => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${record.date}（${record.rule}）</strong><br>
      ${record.players.map(p => `${p.rank}位 ${p.name}: ${p.score}`).join("<br>")}
      <br>
      <small>${record.note || ""}</small>
    `;
    container.appendChild(div);
  });
}

// -------------------------
// 成績追加
// -------------------------
document.getElementById("add-record-btn").addEventListener("click", () => {
  const date = document.getElementById("game-date").value;
  const rule = document.getElementById("game-rule").value;
  const note = document.getElementById("game-note").value;

  const nameEls = document.querySelectorAll(".player-name");
  const scoreEls = document.querySelectorAll(".player-score");
  const rankEls  = document.querySelectorAll(".player-rank");

  const players = [];

  for (let i = 0; i < nameEls.length; i++) {
    const name = nameEls[i].value.trim();
    const score = Number(scoreEls[i].value);
    const rank = Number(rankEls[i].value);

    if (!name) continue;

    players.push({ name, score, rank });
  }

  if (!date || players.length === 0) {
    alert("日付とプレイヤー情報を入力してください");
    return;
  }

  const record = {
    id: Date.now().toString(),
    date,
    rule,
    players,
    note
  };

  records.push(record);
  saveRecords(records);
  renderRecordList();
  alert("成績を追加しました！");
});


