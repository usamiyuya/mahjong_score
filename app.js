import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = window.db;

// Firestore コレクション参照
const recordsCol = collection(db, "records");
const playersCol = collection(db, "players");

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
// プレイヤー名候補の読み込み
// -------------------------
async function loadPlayers() {
  const snap = await getDocs(playersCol);
  const list = document.getElementById("player-list");
  list.innerHTML = "";

  snap.forEach(doc => {
    const option = document.createElement("option");
    option.value = doc.data().name;
    list.appendChild(option);
  });
}
loadPlayers();

// -------------------------
// 成績追加
// -------------------------
document.getElementById("add-record-btn").addEventListener("click", async () => {
  const date = document.getElementById("game-date").value;
  const rule = document.getElementById("game-rule").value;

  const uma = document.getElementById("game-uma").value || "10-30";
  const oka = Number(document.getElementById("game-oka").value || 0);

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

    const point = calcPoint(score, rank, uma, oka);

    players.push({ name, score, rank, point });

    await addDoc(playersCol, { name });
  }

  const record = {
    date,
    rule,
    uma,
    oka,
    players,
    note,
    createdAt: Date.now()
  };

  await addDoc(recordsCol, record);

  alert("クラウドに保存しました！");
  loadRecords();
});

// -------------------------
// ポイント計算
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
// 成績一覧の読み込み
// -------------------------
async function loadRecords() {
  const snap = await getDocs(recordsCol);
  const container = document.getElementById("record-list");
  container.innerHTML = "";

  snap.forEach(docSnap => {
    const r = docSnap.data();

    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${r.date}（${r.rule}）</strong><br>
      ウマ: ${r.uma} / オカ: ${r.oka}<br><br>
      ${r.players.map(p => `${p.rank}位 ${p.name}: ${p.point.toFixed(1)}P`).join("<br>")}
      <br><br>
      <button class="delete-btn" onclick="deleteRecord('${docSnap.id}')">削除</button>
    `;
    container.appendChild(div);
  });
}
loadRecords();

// -------------------------
// 日別集計
// -------------------------
document.getElementById("show-daily-btn").addEventListener("click", async () => {
  const date = document.getElementById("daily-date").value;
  if (!date) return;

  const snap = await getDocs(recordsCol);
  const daily = [];

  snap.forEach(docSnap => {
    const r = docSnap.data();
    if (r.date === date) daily.push(r);
  });

  const container = document.getElementById("daily-list");
  container.innerHTML = "";

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
async function renderPlayerTotals() {
  const snap = await getDocs(recordsCol);
  const totals = {};

  snap.forEach(docSnap => {
    const r = docSnap.data();
    r.players.forEach(p => {
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

// -------------------------
// 削除
// -------------------------
window.deleteRecord = async function(id) {
  if (!confirm("削除しますか？")) return;
  await deleteDoc(doc(db, "records", id));
  loadRecords();
};
