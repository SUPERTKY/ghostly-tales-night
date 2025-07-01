// Firebase 初期化（firebase.js に入れてあると仮定）

// 🔊 初回クリックでBGM再生＆ボタン有効化
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

// 🎮 ボタンクリックで画面遷移＋音再生＋フェード
playButton.addEventListener("click", () => {
  clickSound.currentTime = 0;
  clickSound.play().catch(e => console.error("クリック音再生失敗:", e));

  fadeOverlay.style.opacity = "1";

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

  clickSound.addEventListener("ended", () => {
    location.href = "menu.html";
  });
});

// 🔐 暗証番号チェック（Firebase v8構文）
document.getElementById("submitPin").addEventListener("click", () => {
  const input = document.getElementById("pinInput").value;

  firebase.database().ref("pin").once("value").then(snapshot => {
    const correctPin = snapshot.val();

    if (input === correctPin) {
      const storedName = localStorage.getItem("playerName");

      if (storedName) {
        unlockUI();
      } else {
        document.getElementById("nameInputArea").style.display = "block";
        document.getElementById("inputBlocker").style.display = "block";
        document.getElementById("lockArea").style.display = "none";
        fadeOverlay.style.opacity = "0";
        fadeOverlay.style.pointerEvents = "none";
      }
    } else {
      document.getElementById("error").style.display = "block";
    }
  });
});

// 名前の決定ボタン処理
document.getElementById("nameSubmit").addEventListener("click", () => {
  const name = document.getElementById("nameInput").value.trim();

  if (name.length > 0) {
    localStorage.setItem("playerName", name);
    document.getElementById("nameInputArea").style.display = "none";
    document.getElementById("inputBlocker").style.display = "none";
    unlockUI();
  } else {
    alert("名前を入力してください");
  }
});

// 🔓 UIを解除する関数
function unlockUI() {
  const playButton = document.getElementById("playButton");
  const fadeOverlay = document.getElementById("fadeOverlay");

  playButton.classList.remove("disabled");
  playButton.classList.add("enabled");
  document.getElementById("lockArea").style.display = "none";
  document.getElementById("error").style.display = "none";
  fadeOverlay.style.opacity = "0";
  fadeOverlay.style.pointerEvents = "none";
}
