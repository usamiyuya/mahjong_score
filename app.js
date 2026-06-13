// タブボタンを取得
const tabButtons = document.querySelectorAll(".bottom-nav button");
const tabPages = document.querySelectorAll(".tab-page");

// タブ切り替え処理
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;

    // ボタンの active 切り替え
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // ページの active 切り替え
    tabPages.forEach(page => {
      page.classList.remove("active");
      if (page.id === target) {
        page.classList.add("active");
      }
    });
  });
});
