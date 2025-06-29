// 要素取得
const bgm = document.getElementById("bgm");
const clickSound = document.getElementById("clickSound");
const playButton = document.getElementById("playButton");
const fadeOverlay = document.getElementById("fadeOverlay");

// -----------------------
// 🔊 初回クリックでBGM再生＆ボタン有効化
// -----------------------
function activateGame() {
  bgm.volume = 1.0;
  bgm.play().catch((e) => console.error("BGM再生失敗:", e));
  playButton.classList.add("enabled");
  document.body.removeEventListener("click", activateGame);
}
document.body.addEventListener("click", activateGame);

// -----------------------
// 🎮 ボタンクリックで画面遷移＋音再生＋フェード
// -----------------------
playButton.addEventListener("click", () => {
  // 効果音は即時再生
  clickSound.currentTime = 0;
  clickSound.play().catch(e => console.error("クリック音再生失敗:", e));

  // 黒いオーバーレイをフェードイン（暗転）
  fadeOverlay.style.opacity = "1";

  // BGM フェードアウト（約0.8秒）
  let fadeSteps = 10;
  let volumeStep = bgm.volume / fadeSteps;
  let fadeInterval = setInterval(() => {
    if (fadeSteps > 0) {
      bgm.volume = Math.max(0, bgm.volume - volumeStep);
      fadeSteps--;
    } else {
      clearInterval(fadeInterval);
      bgm.pause();
    }
  }, 80);

  // 効果音が終わったら画面遷移
  clickSound.addEventListener("ended", () => {
    location.href = "menu.html";
  });
});

// -----------------------
// 🔐 暗証番号チェック（Firebase）
// -----------------------
document.getElementById("submitPin").addEventListener("click", () => {
  const input = document.getElementById("pinInput").value;

  db.ref("pin").once("value").then(snapshot => {
    const correctPin = snapshot.val();
    if (input === correctPin) {
  // ✅ 正解：UI解除とボタン有効化
      // ✅ 正解：UIを解除
      document.getElementById("fadeOverlay").style.opacity = "0";
      playButton.classList.remove("disabled");Add commentMore actions
      playButton.classList.add("enabled");
      document.getElementById("lockArea").style.display = "none";
      document.getElementById("error").style.display = "none";
      fadeOverlay.style.pointerEvents = "none";  // クリックも貫通させる
}
 else {
      // ❌ 不正解：エラー表示
      document.getElementById("error").style.display = "block";
    }
  });
});
