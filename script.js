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
  // 🎵 効果音は即時再生
  clickSound.currentTime = 0;
  clickSound.play().catch(e => console.error("クリック音再生失敗:", e));

  // 🌑 即フェードアウト
  fadeOverlay.style.opacity = "1";

  // 🎵 BGMをゆっくり（例：0.8秒）でフェードアウト
  let fadeSteps = 10;
  let fadeInterval = setInterval(() => {
    if (fadeSteps > 0) {
      bgm.volume -= 1.0 / fadeSteps;
      fadeSteps--;
    } else {
      clearInterval(fadeInterval);
      bgm.volume = 0;
      bgm.pause();
    }
  }, 80); // 80ms × 10 = 約0.8秒

  // 🔁 効果音が終わったら遷移
  clickSound.addEventListener("ended", () => {
    location.href = "game.html";
  });
});
