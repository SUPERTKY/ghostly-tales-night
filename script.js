const bgm = document.getElementById("bgm");
const clickSound = document.getElementById("clickSound");
const playButton = document.getElementById("playButton");
const fadeOverlay = document.getElementById("fadeOverlay");

function activateGame() {
  bgm.volume = 1.0;
  bgm.play().catch((e) => console.error("BGM再生失敗:", e));
  playButton.classList.add("enabled");
  document.body.removeEventListener("click", activateGame);
}

document.body.addEventListener("click", activateGame);

playButton.addEventListener("click", () => {
  // 黒画面に即フェード
  fadeOverlay.style.opacity = "1";

  // BGM高速フェード（0.3秒）
  let fadeSteps = 6;
  let fadeInterval = setInterval(() => {
    if (fadeSteps > 0) {
      bgm.volume -= 1.0 / 6;
      fadeSteps--;
    } else {
      clearInterval(fadeInterval);
      bgm.volume = 0;
      bgm.pause();

      // 🎵 BGMフェード完了後にクリック音再生
      clickSound.currentTime = 0;
      clickSound.play().catch(e => console.error("クリック音再生失敗:", e));

      // 🔁 効果音が終わったらページ遷移
      clickSound.addEventListener("ended", () => {
        location.href = "game.html"; // ← 任意に変更
      });
    }
  }, 50); // 合計 50ms × 6 = 300ms
});
