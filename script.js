const bgm = document.getElementById("bgm");
const clickSound = document.getElementById("clickSound");
const playButton = document.getElementById("playButton");
const fadeOverlay = document.getElementById("fadeOverlay");

function activateGame() {
  bgm.play().catch((e) => console.error("BGM再生失敗:", e));
  playButton.classList.add("enabled");
  document.body.removeEventListener("click", activateGame);
}

document.body.addEventListener("click", activateGame);

playButton.addEventListener("click", () => {
  clickSound.currentTime = 0;
  clickSound.play().catch(e => console.error("クリック音再生失敗:", e));

  // フェードアウト開始
  fadeOverlay.style.opacity = "1";

  // フェード完了後に遷移（1秒後）
  setTimeout(() => {
    location.href = "game.html"; // ← 任意のページに変更
  }, 1000);
});
