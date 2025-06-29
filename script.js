const playButton = document.getElementById("playButton");
const bgm = document.getElementById("bgm");

playButton.addEventListener("click", () => {
  if (bgm.paused) {
    bgm.play().catch((e) => {
      console.error("BGMの再生に失敗しました:", e);
    });
  }

  alert("ゲームスタート！");
  // location.href = "game.html"; などに変更可
});
