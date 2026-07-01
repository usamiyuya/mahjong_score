import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  where,
  limit,
  updateDoc
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
// グローバル変数
// ===================================
let playerNames = [];

let editingInput = null;

let activePlayerInput = null;

let playerChart = null;

let sparkleInterval = null;
let sparkleAnimationStarted = false;

// ===================================
// 初期化
// ===================================

window.addEventListener("load", async () => {

  setupTabs();

  await loadRules();

  setupRuleEvents();

  await loadPlayers();
  setupPlayerDropdown();

  await loadRecords();

  setupRecordEvents();

  setupScoreInputs();

  updateRankOptions();

  document
    .getElementById(
      "game-rule"
    )
    ?.addEventListener(
      "change",
      updateRankOptions
    );

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

  const lastRuleId =
    localStorage.getItem(
      "lastRuleId"
    );
  if (lastRuleId) {
    const exists =
      [...select.options]
        .some(
          o => o.value === lastRuleId
        );
    if (exists) {
      select.value =
        lastRuleId;
    }
  }
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
      () => {
        applySelectedRule();
        localStorage.setItem(
          "lastRuleId",
          select.value
        );
      }
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

  const gameType =
    document.getElementById(
      "game-rule"
    )?.value || "4";
  if (gameType === "3") {
    if (rank === 1)
      umaPoint = uma1;
    if (rank === 2)
      umaPoint = 0;
    if (rank === 3)
      umaPoint = -uma1;
  } else {
    if (rank === 1)
      umaPoint = uma1;
    if (rank === 2)
      umaPoint = uma2;
    if (rank === 3)
      umaPoint = -uma2;
    if (rank === 4)
      umaPoint = -uma1;
  }

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
  playerNames = [];
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
  snap.forEach(docSnap => {
    const player =
      docSnap.data();
    playerNames.push(
      player.name
    );
  });
}

document.addEventListener(
  "blur",
  e => {
    if (
      e.target.classList?.contains(
        "player-name"
      )
    ) {
      setTimeout(() => {
        e.target.readOnly =
          true;
      }, 300);
    }
  },
  true
);

function createPlayerDropdown(input) {
  let dropdown =
    input.parentElement
      .querySelector(
        ".player-dropdown"
      );
  if (dropdown) {
    dropdown.remove();
  }
  dropdown =
    document.createElement("div");
  dropdown.className =
    "player-dropdown";
  const keyword =
    input.value
      .trim()
      .toLowerCase();
  const filtered =
    playerNames.filter(name =>
      name
        .toLowerCase()
        .includes(keyword)
    );
  filtered
    .slice(0, 10)
    .forEach(name => {
      const item =
        document.createElement(
          "div"
        );
      item.className =
        "player-option";
      item.textContent =
        name;
      item.addEventListener(
        "click",
        () => {
          input.value = name;
          input.readOnly = true;
          editingInput = null;
          dropdown.remove();
        }
      );
      dropdown.appendChild(
        item
      );
    });
  if (
    dropdown.children.length > 0
  ) {
    input.parentElement.appendChild(
      dropdown
    );
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
// スコア入力設定
// ===================================
function setupScoreInputs() {
  document
    .querySelectorAll(".player-score")
    .forEach(input => {
      input.addEventListener(
        "input",
        () => {
          let value =
            input.value.replace(
              /[^0-9-]/g,
              ""
            );
          value =
            value.replace(
              /(?!^)-/g,
              ""
            );
          input.value = value;
        }
      );
    });
  // ここから追加
  document
    .querySelectorAll(".minus-btn")
    .forEach(btn => {
      btn.addEventListener(
        "click",
        () => {
          const input =
            btn.parentElement
               .querySelector(
                 ".player-score"
               );
          if (!input) return;
          if (
            input.value.startsWith("-")
          ) {
            input.value =
              input.value.slice(1);
          } else {
            input.value =
              "-" + input.value;
          }
          input.focus();
        }
      );
    });
}

// ===================================
// 三麻/四麻設定切り替え
// ===================================
function updateRankOptions() {
  const gameType =
    document.getElementById(
      "game-rule"
    )?.value || "4";
  document
    .querySelectorAll(".player-rank")
    .forEach(select => {
      const current =
        select.value;
      select.innerHTML = "";
      const maxRank =
        gameType === "3"
          ? 3
          : 4;
      for (
        let i = 1;
        i <= maxRank;
        i++
      ) {
        const option =
          document.createElement(
            "option"
          );
        option.value = i;
        option.textContent =
          `${i}位`;
        select.appendChild(
          option
        );
      }
      if (
        Number(current) <= maxRank
      ) {
        select.value = current;
      }
    });
  document
    .querySelectorAll(".player-card")
    .forEach((card, index) => {
      if (
        gameType === "3" &&
        index === 3
      ) {
        card.style.display = "none";
      } else {
        card.style.display = "";
      }
    });
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
        lastUsed: Date.now()
      }
    );
    return;
  }
  await addDoc(
    playersCol,
    {
      name,
      lastUsed: Date.now()
    }
  );
}

function setupPlayerDropdown() {
  document
    .querySelectorAll(
      ".player-name"
    )
    .forEach(input => {
      if (input.dataset.setup) {
        return;
      }
      input.dataset.setup = "1";
      input.addEventListener(
        "click",
        () => {
          if (input.readOnly) {
            document
              .querySelectorAll(
                ".player-dropdown"
              )
              .forEach(d =>
                d.remove()
              );
            createPlayerDropdown(
              input
            );
          }
        }
      );
    });
  document
    .querySelectorAll(
      ".edit-player-btn"
    )
    .forEach(btn => {
      if (btn.dataset.setup) {
        return;
      }
      btn.dataset.setup = "1";
      btn.addEventListener(
        "click",
        () => {
          const input =
            btn.parentElement
               .querySelector(
                 ".player-name"
               );
          input.readOnly =
            false;
          editingInput =
            input;
          input.focus();
        }
      );
    });
  document.addEventListener(
    "click",
    e => {
      if (
        !e.target.closest(
          ".player-input-wrapper"
        )
      ) {
        document
          .querySelectorAll(
            ".player-dropdown"
          )
          .forEach(d =>
            d.remove()
          );
      }
    }
  );
}

// ===================================
// 成績保存
// ===================================
async function saveRecord() {

  let totalScore = 0;
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

  // 三麻・四麻人数チェック
  const gameType =
    document.getElementById(
      "game-rule"
    )?.value || "4";
  if (
    gameType === "4" &&
    players.length <= 3
  ) {
    alert(
      "四麻が選択されていますが、プレイヤーが4人未満です。"
    );
    return;
  }
  if (
    gameType === "3" &&
    players.length <= 2
  ) {
    alert(
      "三麻が選択されていますが、プレイヤーが3人未満です。"
    );
    return;
  }

  const names =
    players.map(p => p.name);
  const duplicateNames =
    names.filter(
      (name, index) =>
        names.indexOf(name) !== index
    );
  if (duplicateNames.length > 0) {
    alert(
      `同じプレイヤー名が入力されています。\n\n${[...new Set(duplicateNames)].join("、")}`
    );
    return;
  }

  players.forEach(p => {
    totalScore += p.score;
  });
  const requiredTotal =
    gameType === "3"
      ? 105000
      : 100000;
  if (totalScore !== requiredTotal) {
    alert(
      `素点合計が${requiredTotal}点ではありません（現在: ${totalScore}点）`
    );
    return;
  }

  const ranks =
    players.map(p => p.rank);
  const duplicateRanks =
    [...new Set(
      ranks.filter(
        (rank, index) =>
          ranks.indexOf(rank) !== index
      )
    )];
  if (duplicateRanks.length > 0) {
    const proceed =
      confirm(
        `同じ順位が入力されています。\n\n${duplicateRanks.join("位、")}位\n\nこのまま登録しますか？`
      );
    if (!proceed) {
      return;
    }
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
    gameType,
    rule: currentRule.name,
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
  await loadRecords();
  setupPlayerDropdown();

}

// ===================================
// 成績修正期間
// ===================================
const EDIT_LIMIT =
  // 60 * 60 * 1000; // 一時間制約の場合
  60 * 60 * 24 * 1000; // 一日制約の場合
function canEdit(record){
  return (
    Date.now() -
    record.createdAt
  ) < EDIT_LIMIT;
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

    const r = docSnap.data();

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
      (${r.gameType === "3" ? "三麻" : "四麻"}/${r.rule})<br>
      ${sortedPlayers
        .map(p =>
          `${p.rank}位
          ${p.name}
          (${p.point})`
        )
        .join("<br>")}
      <br><br>
      ${
        canEdit(r)
        ?
        `
        <button
          class="delete-record-btn"
          data-id="${docSnap.id}">
          削除
        </button>
        `
        :
        `
        <span>
          🔒確定済
        </span> `
      }
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
          const target =
            btn.dataset.id;
          const snap =
            await getDoc(
              doc(
                db,
                "records",
                target
              )
            );
          const record =
            snap.data();
          if (
            !record ||
            !canEdit(record)
          ) {
            alert(
              "確定済みデータのため削除できません"
            );
            return;
          }
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
              target
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
        limit(1)
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
      <strong>(${r.date} ${r.gameType === "3" ? "三麻" : "四麻"})</strong>
      <br>
      チップ精算
      <hr>
      ${
        r.players
        .map(p =>
          `${p.name} ${p.chip}枚`
        )
        .join("<br>")
      }
      <br><br>
      ${
        canEdit(r)
        ?
        `
        <button
          class="delete-chip-btn"
          data-id="${docSnap.id}">
          削除
        </button>
        `
        :
        `
        <span>
          🔒確定済
        </span>
        `
      }
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
          const target =
            btn.dataset.id;
          const snap =
            await getDocs(
              chipRecordsCol
            );
          let record = null;
          snap.forEach(docSnap => {
            if (
              docSnap.id === target
            ) {
              record =
                docSnap.data();
            }
          });
          if (
            !record ||
            !canEdit(record)
          ) {
            alert(
              "確定済みデータのため削除できません"
            );
            return;
          }
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
      （${r.gameType === "3" ? "三麻" : "四麻"} / ${r.rule}）
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
          `${p.name} ${p.chip}枚`
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
// グラフ描画
// ===================================
function renderPlayerChart(totals) {
  const ctx = document.getElementById("player-point-chart");
  if (!ctx) return;

  
  const chartArea = ctx.getContext("2d");
  
  const entries = Object.entries(totals)
    .map(([name, t]) => ({
      name,
      value: t.point + (t.chip || 0)
    }))
    .sort((a, b) => b.value - a.value);

  const labels = entries.map(e => e.name);
  const data = entries.map(e => e.value);

  const topName = entries[0]?.name;

  const colors = entries.map(e => {
    if (e.name === topName) return "rgba(255, 215, 0, 1)";
    return e.value >= 0
    ? "rgba(46, 204, 113, 0.8)"
      : "rgba(231, 76, 60, 0.8)";
    });
    
  const borders = entries.map(e => {
    if (e.name === topName) return "rgba(218, 165, 32, 1)";
    return e.value >= 0
    ? "rgba(39, 174, 96, 1)"
    : "rgba(192, 57, 43, 1)";
  });
  
  if (playerChart) playerChart.destroy();
  
  playerChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "総合ポイント",
        data,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      indexAxis: "y",
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: "#ddd"
          }
        }
      },
      animation: false,
    },
  });
  const meta = playerChart.getDatasetMeta(0);
  const chartdata = playerChart.data.datasets[0].data;
  const maxIndex = chartdata.indexOf(Math.max(...chartdata));
  const bar = meta.data[maxIndex];
  if (sparkleInterval) {
   clearInterval(sparkleInterval);
   sparkleInterval = null;
  }
  sparkleInterval = setInterval(() => {
    if (!bar) return;
    const props = bar.getProps(["x", "y", "base", "width", "height"], true);
    const barHeight = bar.height;
    const top = props.y - barHeight / 2;
    const bottom = props.y + barHeight / 2;
    const x = props.base + Math.random() * (props.x - props.base);
    const y = top + Math.random() * barHeight;
    sparkles.push(
      createSparkle(x, y)
    );
  }, 250);
  
  resizeSparkleCanvas();
  if (!sparkleAnimationStarted){
    sparkleAnimationStarted = true;
    animateSparkles();
  }
}


// ===================================
// プレイヤー集計
// ===================================
async function renderPlayerTotals() {
  const gameFilter =
    document.getElementById("player-game-filter")?.value || "all";
  
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
    if (gameFilter !== "all" && r.gameType !== gameFilter) return;
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
    if (gameFilter !== "all" && r.gameType !== gameFilter) return;
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
    renderPlayerChart(totals);
    document
    .getElementById("player-game-filter")
    ?.addEventListener("change", renderPlayerTotals);
}


// ===================================
// チップ保存
// ===================================
async function saveChipRecord() {
  const players = [];
  const names =
    document.querySelectorAll(".chip-name");
  const values =
    document.querySelectorAll(".chip-value");
  for (let i = 0; i < names.length; i++) {
    const name =
      names[i].value.trim();
    const chip =
      Number(values[i].value);
    // ⭐ここが重要：名前がない行は無視
    if (!name) continue;
    players.push({
      name,
      chip
    });
  }
  // 合計チェック（今まで通り）
  const total =
    players.reduce((sum, p) => sum + p.chip, 0);
  if (total !== 0) {
    alert("チップ合計が0ではありません");
    return;
  }
  const gameType =
    document.getElementById(
      "game-rule"
    )?.value || "4";
  await addDoc(chipRecordsCol, {
    date:
      document.getElementById(
        "game-date"
      ).value,
    gameType,
    chipValue:
      currentRule.chipValue,
    players,
    createdAt:
      Date.now()
  });
  alert("チップ精算を保存しました");
  await loadRecords();
  await renderPlayerTotals();
}

// ===================================
// グラフアニメーション
// ===================================
const sparkleCanvas = document.getElementById("sparkle-layer");
const sparkleCtx = sparkleCanvas.getContext("2d");

let sparkles = [];

function resizeSparkleCanvas() {
  const chart = document.getElementById("player-point-chart");

  sparkleCanvas.width = chart.clientWidth;
  sparkleCanvas.height = chart.clientHeight;
}

function createSparkle(x, y) {
  return {
    x,
    y,
    size: Math.random() * 10 + 10, // 基準サイズ（✨は少し大きめでもOK）
    life: 0, // 0 → 1で進行
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
  };
}


// 表示図形
function drawCurvedDiamond(ctx, s) {
  const progress = s.life;
  // 拡大縮小（ポン→ふわ→消える）
  const scale = Math.sin(progress * Math.PI);
  const alpha = 1 - progress;
  const size = s.size * scale * 0.3;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.globalAlpha = alpha;
  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  const w = size * 0.9;  // 横
  const h = size * 1.2;  // 縦（やや縦長）
  ctx.beginPath();
  // 上頂点
  ctx.moveTo(0, -h);
  // 右辺（少し内側に湾曲）
  ctx.quadraticCurveTo(
    w * 0.6, -h * 0.4,
    w, 0
  );
  // 下右 → 下（湾曲）
  ctx.quadraticCurveTo(
    w * 0.6, h * 0.4,
    0, h
  );
  // 下左（湾曲）
  ctx.quadraticCurveTo(
    -w * 0.6, h * 0.4,
    -w, 0
  );
  // 上左（湾曲）
  ctx.quadraticCurveTo(
    -w * 0.6, -h * 0.4,
    0, -h
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDiamond(ctx, x, y, size, alpha, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;

  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.shadowBlur = 8;

  ctx.fillStyle = "rgba(255,255,255,0.95)";

  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}


function animateSparkles() {
  sparkleCtx.clearRect(
    0,
    0,
    sparkleCanvas.width,
    sparkleCanvas.height
  );
  sparkles.forEach(s => {
    // 移動？
    // s.x += s.vx;
    // s.y += s.vy;
    // 進行
    s.life += 0.02;
    drawCurvedDiamond(sparkleCtx, s);
  });
  // 完全消滅
  sparkles = sparkles.filter(s => s.life < 1);
  requestAnimationFrame(animateSparkles);
}