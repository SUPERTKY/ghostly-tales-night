let activated = false;

document.body.addEventListener("click", () => {
  if (activated) return;
  activated = true;

  const bgm = document.getElementById("bgm");
  const playButton = document.getElementById("playButton");

  // BGM再生（失敗しても無視）
  bgm.play().catch((e) => console.error("BGM再生失敗:", e));

  // ボタンを有効化
  playButton.classList.add("enabled");

  // ボタンクリック可能に
  playButton.addEventListener("click", () => {
    alert("ゲームスタート！");
    // location.href = "game.html";
  });
});
