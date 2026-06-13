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
// ポイント計算（ウマ・オカ込み）
// -------------------------
function calcPoint(score, rank, uma, oka) {
  const [uma2, uma1] = uma.split("-").map(Number);

  let umaPoint = 0;
  if (rank === 1) umaPoint = uma1;
  if (rank === 2) umaPoint = uma2;
  if (rank === 3) umaPoint = -uma2;
  if (rank === 4) umaPoint = -uma1;

  const base = score / 1000;
  const okaPoint = rank === 1 ? oka : 0;

  return base + umaPoint + okaPoint;
}

// -------------------------
// 成績追加
// -------------------------
document.getElementById("add-record-btn").addEventListener("click", () => {
  const date = document.getElementById("game-date").value;
  const rule = document.getElementById("game-rule").value;
  const uma = document.getElementById("game-uma").value;
  const oka = Number(document.getElementById("game-oka").value);
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

    const point = calcPoint(score, rank, uma, oka);

    playersData.push({ name, score, rank, point });

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
    uma,
    oka,
    players: playersData,
    note
  };

  records.push(record);
  saveRecords(records);

  renderRecordList();
  alert("成績を追加しました！");
});

// -------------------------
// 編集処理
// -------------------------
function editRecord(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;

  // 入力欄に反映
  document.getElementById("game-date").value = record.date;
  document.getElementById("game-rule").value = record.rule;
  document.getElementById("game-uma").value = record.uma;
  document.getElementById("game-oka").value = record.oka;
  document.getElementById("game-note").value = record.note;

  const nameEls = document.querySelectorAll(".player-name");
  const scoreEls = document.querySelectorAll(".player-score");
  const rankEls  = document.querySelectorAll(".player-rank");

  for (let i = 0; i < 4; i++) {
    if (record.players[i]) {
      nameEls[i].value = record.players[i].name;
      scoreEls[i].value = record.players[i].score;
      rankEls[i].value = record.players[i].rank;
    } else {
      nameEls[i].value = "";
      scoreEls[i].value = "";
      rankEls[i].value = "";
    }
  }

  // 削除して再追加する方式
  records = records.filter(r => r.id !== id);
  saveRecords(records);
  renderRecordList();

  alert("編集モードになりました。修正後に『成績を追加』を押してください。");
}

// -------------------------
// 削除処理
// -------------------------
function deleteRecord(id) {
  if (!confirm("本当に削除しますか？")) return;

  records = records.filter(r => r.id !== id);
  saveRecords(records);
  renderRecordList();
}

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
      ウマ: ${record.uma} / オカ: ${record.oka}<br><br>
      ${record.players.map(p => `${p.rank}位 ${p.name}: 素点 ${p.score} → ${p.point.toFixed(1)}P`).join("<br>")}
      <br><br>
      <button class="edit-btn" onclick="editRecord('${record.id}')">編集</button>
      <button class="delete-btn" onclick="deleteRecord('${record.id}')">削除</button>
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
        totals[p.name] = { totalPoint: 0, ranks: [], games: 0 };
      }
      totals[p.name].totalPoint += p.point;
      totals[p.name].ranks.push(p.rank);
      totals[p.name].games++;
    });
  });

  return totals;
}

document.getElementById("show-daily-btn").addEventListener("click", () => {
  const date = document.getElementById("daily-date").value;
  const totals = calcDailyTotals(date);

  const container = document.getElementById("daily-list");
  container.innerHTML = "";

  for (const name in totals) {
    const t = totals[name];
    const avgRank = (t.ranks.reduce((a,b)=>a+b,0) / t.ranks.length).toFixed(2);

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${name}</strong><br>
      合計ポイント: ${t.totalPoint.toFixed(1)}<br>
      平均順位: ${avgRank}<br>
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
        totals[p.name] = { totalPoint: 0, ranks: [], games: 0 };
      }
      totals[p.name].totalPoint += p.point;
      totals[p.name].ranks.push(p.rank);
      totals[p.name].games++;
    });
  });

  const container = document.getElementById("players-list");
  container.innerHTML = "";

  for (const name in totals) {
    const t = totals[name];
    const avgRank = (t.ranks.reduce((a,b)=>a+b,0) / t.ranks.length).toFixed(2);

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${name}</strong><br>
      合計ポイント: ${t.totalPoint.toFixed(1)}<br>
      平均順位: ${avgRank}<br>
      対局数: ${t.games}
    `;
    container.appendChild(div);
  }
}
