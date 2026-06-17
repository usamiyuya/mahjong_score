import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===================================
// Firestore
// ===================================

const db = window.db;

const recordsCol = collection(db, "records");
const playersCol = collection(db, "players");
const rulesCol = collection(db, "rules");
const chipRecordsCol = collection(db, "chipRecords");

// ===================================
// ルール定義
// ===================================

const DEFAULT_RULES = [
  {
    name: "一般フリー",
    returnPoint: 30000,
    uma: "10-30",
    oka: 0,
    tobi: 0,
    chipValue: 1,
    rounding: "mahjong"
  },
  {
    name: "Mリーグ",
    returnPoint: 30000,
    uma: "0-0",
    oka: 0,
    tobi: 0,
    chipValue: 0,
    rounding: "floor"
  },
  {
    name: "競技麻雀",
    returnPoint: 30000,
    uma: "5-15",
    oka: 0,
    tobi: 0,
    chipValue: 0,
    rounding: "mahjong"
  }
];

// ===================================
// 現在選択中ルール
// ===================================

let currentRule = {
  name: "一般フリー",
  returnPoint: 30000,
  uma: "10-30",
  oka: 0,
  tobi: 0,
  chipValue: 1,
  rounding: "mahjong"
};

// ===================================
// 初期化
// ===================================

window.addEventListener("load", async () => {

  setupTabs();

  await loadRules();

  setupRuleEvents();

  await loadPlayers();

  await loadRecords();

  setupRecordEvents();

});

// ===================================
// タブ切替
// ===================================

function setupTabs() {

  const tabButtons =
    document.querySelectorAll(".bottom-nav button");

  const tabPages =
    document.querySelectorAll(".tab-page");

  tabButtons.forEach(btn => {

    btn.addEventListener("click", () => {

      const target =
        btn.dataset.target;

      tabButtons.forEach(b =>
        b.classList.remove("active")
      );

      btn.classList.add("active");

      tabPages.forEach(page => {

        page.classList.remove("active");

        if (page.id === target) {
          page.classList.add("active");
        }
  
      });
      
      if (target === "tab-players") {
        renderPlayerTotals();
      }

    });

  });

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  document.getElementById(
    "daily-date"
  ).value = today;

  document.getElementById(
    "game-date"
  ).value = today;
  
  document.getElementById(
    "player-period-date"
  ).value = today;
}

// ===================================
// ルールロード
// ===================================

async function loadRules() {

  const select =
    document.getElementById("rule-select");

  if (!select) return;

  select.innerHTML = "";

  const snap =
    await getDocs(rulesCol);

  if (snap.empty) {

    for (const rule of DEFAULT_RULES) {

      await addDoc(
        rulesCol,
        rule
      );

    }

    return loadRules();
  }

  snap.forEach(docSnap => {

    const rule =
      docSnap.data();

    const option =
      document.createElement("option");

    option.value =
      docSnap.id;

    option.textContent =
      rule.name;

    option.dataset.rule =
      JSON.stringify(rule);

    select.appendChild(option);

  });

  applySelectedRule();

}

// ===================================
// 選択ルール反映
// ===================================

function applySelectedRule() {

  const select =
    document.getElementById("rule-select");

  if (!select) return;

  const option =
    select.options[
      select.selectedIndex
    ];

  if (!option) return;

  const rule =
    JSON.parse(
      option.dataset.rule
    );

  currentRule = rule;

  document.getElementById(
    "rule-name"
  ).value =
    rule.name;

  document.getElementById(
    "return-point"
  ).value =
    rule.returnPoint;

  document.getElementById(
    "rounding-rule"
  ).value =
    rule.rounding;

  document.getElementById(
    "rule-uma"
  ).value =
    rule.uma;

  document.getElementById(
    "rule-oka"
  ).value =
    rule.oka;
  document.getElementById(
    "rule-tobi"
  ).value =
    rule.tobi || 0;
  document.getElementById(
    "rule-chip-value"
  ).value =
    rule.chipValue || 0;
}

// ===================================
// イベント登録
// ===================================

function setupRuleEvents() {

  const select =
    document.getElementById(
      "rule-select"
    );

  if (select) {

    select.addEventListener(
      "change",
      applySelectedRule
    );

  }

  const loadBtn =
    document.getElementById(
      "load-rule-btn"
    );

  if (loadBtn) {

    loadBtn.addEventListener("click", () => {

      document.getElementById(
        "current-return-point"
      ).value = currentRule.returnPoint;

      document.getElementById(
        "current-rounding-rule"
      ).value = currentRule.rounding;

      alert(
        `${currentRule.name} を反映しました`
      );

    });

  }

  const saveBtn =
    document.getElementById(
      "save-rule-btn"
    );

  if (saveBtn) {

    saveBtn.addEventListener(
      "click",
      saveRule
    );

  }

  const deleteBtn =
    document.getElementById(
      "delete-rule-btn"
    );

  if (deleteBtn) {

    deleteBtn.addEventListener(
      "click",
      deleteRule
    );

  }

}

// ===================================
// ルール保存
// ===================================

async function saveRule() {

  const name =
    document.getElementById(
      "rule-name"
    ).value.trim();

  if (!name) {

    alert(
      "ルール名を入力してください"
    );

    return;
  }

  const rule = {

    name,

    returnPoint:
      Number(
        document.getElementById(
          "return-point"
        ).value
      ),

    rounding:
      document.getElementById(
        "rounding-rule"
      ).value,

    uma:
      document.getElementById(
        "rule-uma"
      ).value,

    oka:
      Number(
        document.getElementById(
          "rule-oka"
        ).value
      ),

    tobi:
      Number(
        document.getElementById(
          "rule-tobi"
        ).value
      ),

    chipValue:
      Number(
        document.getElementById(
          "rule-chip-value"
        ).value
      ),
  };

  await addDoc(
    rulesCol,
    rule
  );

  alert(
    "ルールを保存しました"
  );

  await loadRules();

}

// ===================================
// 削除関数
// ===================================
const PROTECTED_RULES = [
  "一般フリー",
  "Mリーグ",
  "競技麻雀"
];

async function deleteRule() {
  if (
    PROTECTED_RULES.includes(
      currentRule.name
    )
  ) {

    alert(
      "標準ルールは削除できません"
    );

    return;
  }

  const select =
    document.getElementById(
      "rule-select"
    );

  const ruleId =
    select.value;

  if (!ruleId) return;

  if (
    !confirm(
      "このルールを削除しますか？"
    )
  ) {
    return;
  }

  await deleteDoc(
    doc(
      db,
      "rules",
      ruleId
    )
  );

  alert(
    "削除しました"
  );

  await loadRules();

}

// ===================================
// 端数処理
// ===================================
function roundScore(
  score,
  returnPoint,
  rule
) {

  const diff =
    score - returnPoint;

  switch(rule) {

    case "mahjong":

      if (diff >= 0) {
        return Math.floor(
          diff / 1000
        );
      }

      return Math.ceil(
        diff / 1000
      );

    case "gosha": {

      const abs =
        Math.abs(diff);

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


// ===================================
// ポイント計算
// ===================================
function calcPoint(
  score,
  rank
) {

  console.log(currentRule);

  const returnPoint =
    Number(
      document.getElementById(
        "current-return-point"
      ).value
    );

  const roundingRule =
    document.getElementById(
      "current-rounding-rule"
    ).value;

  const base =
    roundScore(
      score,
      returnPoint,
      roundingRule
    );

  const [uma2, uma1] =
    currentRule.uma
      .split("-")
      .map(Number);

  let umaPoint = 0;

  if (rank === 1)
    umaPoint = uma1;

  if (rank === 2)
    umaPoint = uma2;

  if (rank === 3)
    umaPoint = -uma2;

  if (rank === 4)
    umaPoint = -uma1;

  const okaPoint =
    rank === 1
      ? currentRule.oka
      : 0;

  return (
    base +
    umaPoint +
    okaPoint
  );
}

// ===================================
// プレイヤー読み込み
// ===================================
async function loadPlayers() {

  const datalist =
    document.getElementById(
      "player-list"
    );

  if (!datalist) return;

  datalist.innerHTML = "";

  const q =
    query(
      playersCol,
      orderBy(
        "lastUsed",
        "desc"
      )
    );

  const snap =
    await getDocs(q);
  // const snap =
  //   await getDocs(playersCol);

  snap.forEach(docSnap => {

    const player =
      docSnap.data();

    const option =
      document.createElement(
        "option"
      );

    option.value =
      player.name;

    datalist.appendChild(
      option
    );

  });

  function setupPlayerDropdown() {
    document
      .querySelectorAll(
        ".player-name, .chip-name"
      )
      .forEach(input => {
        input.addEventListener(
          "focus",
          () => {
            const current =
              input.value;
            input.value = " ";
            setTimeout(() => {
              input.value = current;
            }, 0);
          }
        );
      });
  }
}

// ===================================
// 成績保存イベント
// ===================================
function setupRecordEvents() {

  const btn =
    document.getElementById(
      "add-record-btn"
    );

  if (!btn) return;

  btn.addEventListener(
    "click",
    saveRecord
  );

  document
    .getElementById(
      "show-daily-btn"
    )
    ?.addEventListener(
      "click",
      renderDaily
    );

  document
    .getElementById(
      "player-period"
    )
    ?.addEventListener(
      "change",
      renderPlayerTotals
    );

  document
    .getElementById(
      "player-period-date"
    )
    ?.addEventListener(
      "change",
      renderPlayerTotals
    );

  document
    .getElementById(
      "save-chip-btn"
    )
    ?.addEventListener(
      "click",
      saveChipRecord
    );

  const chipToggle =
    document.getElementById(
      "chip-toggle"
    );

  const chipContent =
    document.getElementById(
      "chip-content"
    );

  chipToggle?.addEventListener(
    "click",
    () => {
      chipContent.classList.toggle(
        "open"
      );
      chipToggle.textContent =
        chipContent.classList.contains(
          "open"
        )
        ? "▼ チップ精算"
        : "▶ チップ精算";
    }
  );
}

// ===================================
// プレイヤー登録
// ===================================
async function registerPlayer(name) {

  const q = query(
    playersCol,
    where("name", "==", name)
  );

  const snap =
    await getDocs(q);

  if (!snap.empty) {
    const playerDoc =
      snap.docs[0];
    await updateDoc(
      playerDoc.ref,
      {
        lastUsed:
          Date.now()
      }
    );
  }
}

// ===================================
// 成績保存
// ===================================
async function saveRecord() {

  const players = [];

  const cards =
    document.querySelectorAll(
      ".player-card"
    );

  for (const card of cards) {

    const name =
      card
      .querySelector(".player-name")
      .value
      .trim();

    const score =
      Number(
        card.querySelector(
          ".player-score"
        ).value
      );

    const rank =
      Number(
        card.querySelector(
          ".player-rank"
        ).value
      );

    if (!name) continue;

    players.push({
      name,
      score,
      rank,
      tobiLoser:
        card.querySelector(
          ".tobi-loser"
        ).checked,
      tobiWinner:
        card.querySelector(
          ".tobi-winner"
        ).checked
    });

  }

  players.forEach(p => {
    if (p.rank === 1) {
      p.point = 0;
    } else {
      p.point =
        calcPoint(
          p.score,
          p.rank
        );
    }
  });


  const tobiPoint =
    currentRule.tobi || 0;
  if (tobiPoint > 0) {
    const losers =
      players.filter(
        p => p.tobiLoser
      );
    const winners =
      players.filter(
        p => p.tobiWinner
      );
    losers.forEach(loser => {
      loser.point -= tobiPoint;
      if (winners.length > 0) {
        const share =
          tobiPoint /
          winners.length;
        winners.forEach(winner => {
          winner.point += share;
        });
      }
    });
  }

  const firstPlayer =
    players.find(
      p => p.rank === 1
    );
  if (firstPlayer) {
    const totalWithoutFirst =
      players
        .filter(p => p.rank !== 1)
        .reduce(
          (sum, p) =>
            sum + p.point,
          0
        );
    firstPlayer.point =
      -totalWithoutFirst;
  }

  const record = {

    date:
      document.getElementById(
        "game-date"
      ).value,

    time: 
      new Date().toLocaleTimeString(
        "ja-JP",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
    ),

    rule:
      document.getElementById(
        "game-rule"
      ).value,

    players,

    currentRule,

    createdAt:
      Date.now()

  };

  // Firestoreへ成績保存
  await addDoc(
    recordsCol,
    record
  );
  // プレイヤー自動登録
  for (const p of players) {
    await registerPlayer(p.name);
  }

  alert("保存しました");

  await loadPlayers();
  setupPlayerDropdown();
  await loadRecords();

}

// ===================================
// 最近の成績
// ===================================
async function loadRecords() {

  const container =
    document.getElementById(
      "record-list"
    );

  if (!container) return;

  container.innerHTML = "";

  const q =
    query(
      recordsCol,
      orderBy(
        "createdAt",
        "desc"
      ),
      limit(5)
    );

  const snap =
    await getDocs(q);

  snap.forEach(docSnap => {

    const r =
      docSnap.data();

    const div =
      document.createElement(
        "div"
      );

    div.className =
      "card";

    const sortedPlayers =
      [...r.players]
        .sort((a, b) => a.rank - b.rank);
        
    div.innerHTML = `
      <strong>${r.date}</strong>
      (${r.rule})<br>
      ${sortedPlayers
        .map(p =>
          `${p.rank}位
          ${p.name}
          (${p.point})`
        )
        .join("<br>")}
      <br><br>
      <button
        class="delete-record-btn"
        data-id="${docSnap.id}">
        削除
      </button>
    `;
    container.appendChild(
      div
    );
  });

  container
    .querySelectorAll(
      ".delete-record-btn"
    )
    .forEach(btn => {
      btn.addEventListener(
        "click",
        async () => {
          if (
            !confirm(
              "削除しますか？"
            )
          ) {
            return;
          }
          await deleteDoc(
            doc(
              db,
              "records",
              btn.dataset.id
            )
          );
          await loadRecords();
        }
      );
    });

  const chipSnap =
    await getDocs(
      query(
        chipRecordsCol,
        orderBy(
          "createdAt",
          "desc"
        ),
        limit(5)
      )
    );
  chipSnap.forEach(docSnap => {
    const r =
      docSnap.data();
    const div =
      document.createElement(
        "div"
      );
    div.className =
      "card";
    div.innerHTML = `
      <strong>${r.date}</strong>
      <br>
      チップ精算
      <hr>
      ${
        r.players
        .map(p =>
          `${p.name}
          (${p.chip})`
        )
        .join("<br>")
      }
      <br><br>
      <button
        class="delete-chip-btn"
        data-id="${docSnap.id}">
        削除
      </button>
    `;
    container.appendChild(
      div
    );
  });

  container
    .querySelectorAll(
      ".delete-chip-btn"
    )
    .forEach(btn => {
      btn.addEventListener(
        "click",
        async () => {
          if (
            !confirm(
              "チップ記録を削除しますか？"
            )
          ) {
            return;
          }
          await deleteDoc(
            doc(
              db,
              "chipRecords",
              btn.dataset.id
            )
          );
          await loadRecords();
          await renderPlayerTotals();
        }
      );
    });
}

// ===================================
// 日別集計
// ===================================
async function renderDaily() {
  const date =
    document.getElementById(
      "daily-date"
    ).value;
  const container =
    document.getElementById(
      "daily-list"
    );
  container.innerHTML = "";
  const snap =
    await getDocs(
      recordsCol
    );
  snap.forEach(docSnap => {
    const r =
      docSnap.data();
    if (r.date !== date)
      return;
    const div =
      document.createElement(
        "div"
      );
    div.className =
      "card";
    const sortedPlayers =
      [...r.players]
        .sort((a, b) => a.rank - b.rank);
    div.innerHTML = `
      <strong>${r.time || ""}</strong>
      （${r.rule}）
      <hr>
      ${sortedPlayers
        .map(p =>
          `${p.rank}位 ${p.name}
          (${p.point})`
        )
        .join("<br>")}
    `;
    container.appendChild(
      div
    );
  });

  const chipSnap =
    await getDocs(
      chipRecordsCol
    );
  chipSnap.forEach(docSnap => {
    const r =
      docSnap.data();
    if (r.date !== date)
      return;
    const div =
      document.createElement(
        "div"
      );
    div.className =
      "card";
    div.innerHTML = `
      <strong>
        チップ精算
      </strong>
      <hr>
      ${
        r.players
        .map(p =>
          `${p.name}
          (${p.chip})`
        )
        .join("<br>")
      }
    `;
    container.appendChild(
      div
    );
  });
}


// ===================================
// プレイヤー集計
// ===================================
async function renderPlayerTotals() {

  const container =
    document.getElementById(
      "players-list"
    );

  container.innerHTML = "";

  const totals = {};

  const period =
    document.getElementById(
      "player-period"
    )?.value || "year";

  const targetDate =
    document.getElementById(
      "player-period-date"
    )?.value;

  const today =
    targetDate
      ? new Date(targetDate)
      : new Date();

  const snap =
    await getDocs(
      recordsCol
    );

  snap.forEach(docSnap => {
    const r =
      docSnap.data();
    const gameDate =
      new Date(r.date);
    let include = true;
    switch(period) {
      case "day":
        include =
          gameDate
            .toDateString()
          ===
          today
            .toDateString();
        break;
      case "month":
        include =
          gameDate.getFullYear()
          ===
          today.getFullYear()
          &&
          gameDate.getMonth()
          ===
          today.getMonth();
        break;
      case "year":
        include =
          gameDate.getFullYear()
          ===
          today.getFullYear();
        break;
      case "all":
        include = true;
        break;
    }

    if (!include) return;
    r.players.forEach(p => {
      if (!totals[p.name]) {
        totals[p.name] = {
          point: 0,
          chip: 0,
          games: 0,
          rankSum: 0,
          first: 0,
          second: 0,
          third: 0,
          fourth: 0
        };
      }
      totals[p.name].point +=
        p.point;
      totals[p.name].games++;
      totals[p.name].rankSum +=
        p.rank;
      if (p.rank === 1)
        totals[p.name].first++;
      if (p.rank === 2)
        totals[p.name].second++;
      if (p.rank === 3)
        totals[p.name].third++;
      if (p.rank === 4)
        totals[p.name].fourth++;
    });
  });

  const chipSnap =
    await getDocs(
      chipRecordsCol
    );
  chipSnap.forEach(docSnap => {
    const r = docSnap.data();
    const chipDate =
      new Date(r.date);
    let include = true;
    switch(period) {
      case "day":
        include =
          chipDate.toDateString()
          ===
          today.toDateString();
        break;
      case "month":
        include =
          chipDate.getFullYear()
          === today.getFullYear()
          &&
          chipDate.getMonth()
          === today.getMonth();
        break;
      case "year":
        include =
          chipDate.getFullYear()
          === today.getFullYear();
        break;
      case "all":
        include = true;
        break;
    }
    if (!include) return;
    r.players.forEach(p => {
      if (!totals[p.name]) {
        totals[p.name] = {
          point:0,
          chip:0,
          games:0,
          rankSum:0,
          first:0,
          second:0,
          third:0,
          fourth:0
        };
      }
      totals[p.name].chip +=
        p.chip *
        (r.chipValue || 0);
    });
  });

  Object.keys(totals)
    .forEach(name => {
      const t =
        totals[name];
      const div =
        document.createElement(
          "div"
        );
      const chipPoint =
        t.chip || 0;
      div.className =
        "card";
      div.innerHTML = `
        <strong>${name}</strong><br>
        総合ポイント(チップポイント):
        ${(t.point + chipPoint).toFixed(1)}(${chipPoint.toFixed(1)})pt<br>
        対局数:
        ${t.games}<br>
        平均順位:
        ${(t.rankSum/t.games)
          .toFixed(2)}<br>
        1位:
        ${t.first}<br>
        2位:
        ${t.second}<br>
        3位:
        ${t.third}<br>
        4位:
        ${t.fourth}
      `;

      container.appendChild(
        div
      );

    });

}

// ===================================
// チップ保存
// ===================================
async function saveChipRecord() {
  const players = [];
  const names =
    document.querySelectorAll(
      ".chip-name"
    );

  const values =
    document.querySelectorAll(
      ".chip-value"
    );
  for (
    let i = 0;
    i < names.length;
    i++
  ) {
    const name =
      names[i]
        .value
        .trim();

    const chip =
      Number(
        values[i].value
      );
    if (!name) continue;
    players.push({
      name,
      chip
    });
  }

  const total =
    players.reduce(
      (sum, p) =>
        sum + p.chip,
      0
    );
  if (total !== 0) {
    alert(
      "チップ合計が0ではありません"
    );
    return;
  }

  await addDoc(
    chipRecordsCol,
    {
      date:
        document.getElementById(
          "game-date"
        ).value,
      chipValue:
        currentRule.chipValue,
      players,
      createdAt:
        Date.now()
    }
  );
  alert(
    "チップ精算を保存しました"
  );
  await loadRecords();
  await renderPlayerTotals();
}