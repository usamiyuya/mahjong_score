import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===================================
// Firestore
// ===================================

const db = window.db;

const recordsCol = collection(db, "records");
const playersCol = collection(db, "players");
const rulesCol = collection(db, "rules");

// ===================================
// ルール定義
// ===================================

const DEFAULT_RULES = [
  {
    name: "一般フリー",
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

// ===================================
// 現在選択中ルール
// ===================================

let currentRule = {
  name: "一般フリー",
  returnPoint: 30000,
  uma: "10-30",
  oka: 0,
  rounding: "mahjong"
};

// ===================================
// 初期化
// ===================================

window.addEventListener("load", async () => {

  setupTabs();

  await loadRules();

  setupRuleEvents();

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

    });

  });

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
      )

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