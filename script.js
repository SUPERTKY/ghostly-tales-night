const bgm = document.getElementById("bgm");
const playButton = document.getElementById("playButton");

function activateGame() {
  // BGM再生
  bgm.play().catch((e) => console.error("BGM再生失敗:", e));

  // ボタン有効化
  playButton.classList.add("enabled");

  // 画面全体クリック判定を削除
  document.body.removeEventListener("click", activateGame);
}

// 最初の一回だけ有効なクリックイベント
document.body.addEventListener("click", activateGame);

// 遊ぶボタンクリック処理
playButton.addEventListener("click", () => {
  alert("ゲームスタート！");
  // location.href = "game.html";
});
