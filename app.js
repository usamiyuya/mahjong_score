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

    if (target === "tab-players") renderPlayerTotals();
  });
});

// -------------------------
// localStorage
// -------------------------
const STORAGE_KEY = "mahjong_records";
const PLAYER_KEY = "mahjong_players";

function loadRecords() {
  const json = localStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : [];
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadPlayers() {
  const json = localStorage.getItem(PLAYER_KEY);
  return json ? JSON.parse(json) : [];
}

function savePlayers(players) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(players));
}

let records = loadRecords();
let players = loadPlayers();

// -------------------------
// プレイヤー候補リスト更新
// -------------------------
function updatePlayerList() {
  const list = document.getElementById("player-list");
  list.innerHTML = "";
  players.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    list.appendChild(option);
  });
}
updatePlayerList();

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

  const playersData = [];

  for (let i = 0; i < nameEls.length; i++) {
    const name = nameEls[i].value.trim();
    const score = Number(scoreEls[i].value);
    const rank = Number(rankEls[i].value);

    if (!name) continue;

    playersData.push({ name, score, rank });

    if (!players.includes(name)) {
      players.push(name);
      savePlayers(players);
      updatePlayerList();
    }
  }

  if (!date || playersData.length === 0) {
    alert("日付とプレイヤー情報を入力してください");
    return;
  }

  const record = {
    id: Date.now().toString(),
    date,
    rule,
    players: playersData,
    note
  };

  records.push(record);
  saveRecords(records);

  renderRecordList();
  alert("成績を追加しました！");
});

// -------------------------
// 最近の成績一覧
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
renderRecordList();

// -------------------------
// 日別集計
// -------------------------
function calcDailyTotals(date) {
  const daily = records.filter(r => r.date === date);
  const totals = {};

  daily.forEach(record => {
    record.players.forEach(p => {
      if (!totals[p.name]) {
        totals[p.name] = { totalScore: 0, ranks: [], games: 0 };
      }
      totals[p.name].totalScore += p.score;
      totals[p.name].ranks.push(p.rank);
      totals[p.name].games++;
    });
  });

  for (const name in totals) {
    const t = totals[name];
    t.avgRank = (t.ranks.reduce((a,b)=>a+b,0) / t.ranks.length).toFixed(2);
  }

  return totals;
}

document.getElementById("show-daily-btn").addEventListener("click", () => {
  const date = document.getElementById("daily-date").value;
  const totals = calcDailyTotals(date);

  const container = document.getElementById("daily-list");
  container.innerHTML = "";

  for (const name in totals) {
    const t = totals[name];
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${name}</strong><br>
      トータル: ${t.totalScore}<br>
      平均順位: ${t.avgRank}<br>
      対局数: ${t.games}
    `;
    container.appendChild(div);
  }
});

// -------------------------
// プレイヤー別集計
// -------------------------
function renderPlayerTotals() {
  const totals = {};

  records.forEach(record => {
    record.players.forEach(p => {
      if (!totals[p.name]) {
        totals[p.name] = { totalScore: 0, ranks: [], games: 0 };
      }
      totals[p.name].totalScore += p.score;
      totals[p.name].ranks.push(p.rank);
      totals[p.name].games++;
    });
  });

  const container = document.getElementById("players-list");
  container.innerHTML = "";

  for (const name in totals) {
    const t = totals[name];
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${name}</strong><br>
      トータル: ${t.totalScore}<br>
      平均順位: ${(t.ranks.reduce((a,b)=>a+b,0) / t.ranks.length).toFixed(2)}<br>
      対局数: ${t.games}
    `;
    container.appendChild(div);
  }
}
