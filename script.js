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

let fadeSteps = 10;
let fadeInterval = setInterval(() => {
  if (fadeSteps > 0) {
    bgm.volume -= 1.0 / 10;
    fadeSteps--;
  } else {
    clearInterval(fadeInterval);
    bgm.volume = 0;
    bgm.pause();

    clickSound.currentTime = 0;
    clickSound.play();

    clickSound.addEventListener("ended", () => {
      location.href = "game.html";
    });
  }
}, 80); // ← 80ms間隔

});
