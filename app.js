import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

//const db = window.db;

let recordsCol;
let playersCol;
let rulesCol;

window.addEventListener("load", () => {
  initialize();
});

function initialize() {
  //const db = window.db;

  //window.recordsCol = collection(db, "records");
  //window.playersCol = collection(db, "players");

  const db = window.db;

  recordsCol = collection(db, "records");
  playersCol = collection(db, "players");
  rulesCol = collection(db, "rules");

  loadPlayers();
  loadRecords();

  setupEvents();
}

// Firestore コレクション参照
const recordsCol = collection(db, "records");
const playersCol = collection(db, "players");
const rulesCol = collection(db, "rules");


// -------------------------
// ルール
// -------------------------
const DEFAULT_RULES = [
  {
    name: "芦澤ルール",
    returnPoint: 30000,
    uma: "10-30",
    oka: 0,
    rounding: "mahjong"
  },
  {
    name: "Mリーグ",
    returnPoint: 30000,
    uma: "0-0",
    oka: 0,
    rounding: "floor"
  },
  {
    name: "競技麻雀",
    returnPoint: 30000,
    uma: "5-15",
    oka: 0,
    rounding: "mahjong"
  }
];

//ルール読み込み
async function loadRules() {

  const select = document.getElementById("rule-select");

  select.innerHTML = "";

  const snap = await getDocs(rulesCol);

  if (snap.empty) {

    for (const rule of DEFAULT_RULES) {
      await addDoc(rulesCol, rule);
    }

    return loadRules();
  }

  snap.forEach(docSnap => {

    const rule = docSnap.data();

    const option = document.createElement("option");

    option.value = docSnap.id;
    option.textContent = rule.name;

    option.dataset.rule =
      JSON.stringify(rule);

    select.appendChild(option);
  });

  applySelectedRule();
}

//選択ルール反映
function applySelectedRule() {

  const select =
    document.getElementById("rule-select");

  const option =
    select.options[select.selectedIndex];

  if (!option) return;

  const rule =
    JSON.parse(option.dataset.rule);

  document.getElementById("game-uma").value =
    rule.uma;

  document.getElementById("game-oka").value =
    rule.oka;

  document.getElementById("return-point").value =
    rule.returnPoint;

  document.getElementById("rounding-rule").value =
    rule.rounding;
}

//ルール変更時
document
.getElementById("rule-select")
.addEventListener("change", applySelectedRule);

//ルール保存
document
.getElementById("save-rule-btn")
.addEventListener("click", async () => {

  const name =
    prompt("ルール名を入力してください");

  if (!name) return;

  await addDoc(rulesCol, {

    name,

    returnPoint:
      Number(
        document.getElementById(
          "return-point"
        ).value
      ),

    uma:
      document.getElementById(
        "game-uma"
      ).value,

    oka:
      Number(
        document.getElementById(
          "game-oka"
        ).value
      ),

    rounding:
      document.getElementById(
        "rounding-rule"
      ).value
  });

  await loadRules();

  alert("保存しました");
});

// -------------------------
// プレイヤー別集計
// -------------------------
async function renderPlayerTotals() {

  try {

    const snap = await getDocs(recordsCol);
    const totals = {};

    snap.forEach(docSnap => {
      const r = docSnap.data();

      if (!r.players) return;

      r.players.forEach(p => {
        if (!totals[p.name]) {
          totals[p.name] = {
            totalPoint: 0,
            ranks: [],
            games: 0
          };
        }

        totals[p.name].totalPoint += p.point;
        totals[p.name].ranks.push(p.rank);
        totals[p.name].games++;
      });
    });

    const container =
      document.getElementById("players-list");

    container.innerHTML = "";

    if (Object.keys(totals).length === 0) {
      container.innerHTML =
        "<div class='card'>データがありません</div>";
      return;
    }

    for (const name in totals) {

      const t = totals[name];

      const avgRank =
        (t.ranks.reduce((a,b)=>a+b,0)
          / t.ranks.length)
          .toFixed(2);

      const div =
        document.createElement("div");

      div.className = "card";

      div.innerHTML = `
        <strong>${name}</strong><br>
        合計ポイント: ${t.totalPoint.toFixed(1)}<br>
        平均順位: ${avgRank}<br>
        対局数: ${t.games}
      `;

      container.appendChild(div);
    }

  } catch(err) {

    console.error(err);

  }
}

// -------------------------
// タブ切り替え
// -------------------------
const tabButtons = document.querySelectorAll(".bottom-nav button");
const tabPages = document.querySelectorAll(".tab-page");

tabButtons.forEach(btn => {

  btn.addEventListener("click", async () => {

    const target = btn.dataset.target;

    tabButtons.forEach(b =>
      b.classList.remove("active"));

    btn.classList.add("active");

    tabPages.forEach(page => {

      page.classList.remove("active");

      if (page.id === target) {
        page.classList.add("active");
      }

    });

    if (target === "tab-players") {
      await renderPlayerTotals();
    }

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
//端数処理
function roundScore(
  score,
  returnPoint,
  roundingRule
) {

  const diff = score - returnPoint;

  switch (roundingRule) {

    case "mahjong":

      if (diff >= 0) {
        return Math.floor(diff / 1000);
      }

      return Math.ceil(diff / 1000);

    case "gosha": {

      const abs = Math.abs(diff);

      const th =
        Math.floor(abs / 1000);

      const rem =
        abs % 1000;

      const result =
        rem >= 600
          ? th + 1
          : th;

      return diff >= 0
        ? result
        : -result;
    }

    case "shisha":
      return Math.round(
        diff / 1000
      );

    case "ceil":
      return Math.ceil(
        diff / 1000
      );

    case "floor":
      return Math.floor(
        diff / 1000
      );

    default:
      return Math.floor(
        diff / 1000
      );
  }
}

function calcPoint(
  score,
  rank,
  uma,
  oka
) {

  const returnPoint =
    Number(
      document.getElementById(
        "return-point"
      ).value
    );

  const roundingRule =
    document.getElementById(
      "rounding-rule"
    ).value;

  const base =
    roundScore(
      score,
      returnPoint,
      roundingRule
    );

  const [uma2, uma1] =
    uma.split("-").map(Number);

  let umaPoint = 0;

  if (rank === 1) umaPoint = uma1;
  if (rank === 2) umaPoint = uma2;
  if (rank === 3) umaPoint = -uma2;
  if (rank === 4) umaPoint = -uma1;

  const okaPoint =
    rank === 1 ? oka : 0;

  return (
    base +
    umaPoint +
    okaPoint
  );
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
  console.log("daily clicked");
  const date = document.getElementById("daily-date").value;
  console.log(date);
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
// 削除
// -------------------------
window.deleteRecord = async function(id) {
  if (!confirm("削除しますか？")) return;
  await deleteDoc(doc(db, "records", id));
  loadRecords();
};
