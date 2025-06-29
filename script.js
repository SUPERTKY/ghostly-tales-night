const bgm = document.getElementById("bgm");
const clickSound = document.getElementById("clickSound"); // ★追加
const playButton = document.getElementById("playButton");

function activateGame() {
  bgm.play().catch((e) => console.error("BGM再生失敗:", e));
  playButton.classList.add("enabled");
  document.body.removeEventListener("click", activateGame);
}

document.body.addEventListener("click", activateGame);

playButton.addEventListener("click", () => {
  // ★クリック音を再生
  clickSound.currentTime = 0;
  clickSound.play().catch(e => console.error("クリック音再生失敗:", e));

  alert("ゲームスタート！");
  // location.href = "game.html";
});
