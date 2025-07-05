// Firebaseモジュール読み込み
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase, ref, get, set, onValue, onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// クエリパラメータから roomCode を取得
const params = new URLSearchParams(location.search);
const roomCode = params.get("roomCode");

if (!roomCode) {
  alert("ルーム情報が見つかりませんでした");
  window.location.href = "index.html";
  throw new Error("ルームコードなし");
}

// Firebase 初期化
const firebaseConfig = {
  apiKey: "AIzaSyB1hyrktLnx7lzW2jf4ZeIzTrBEY-IEgPo",
  authDomain: "horror-game-9b2d2.firebaseapp.com",
  databaseURL: "https://horror-game-9b2d2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "horror-game-9b2d2",
  storageBucket: "horror-game-9b2d2.appspot.com",
  messagingSenderId: "534762448588",
  appId: "1:534762448588:web:e0a6a01cd14c7f1dce4469"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);

let sceneStarted = false;
let remainingSeconds = 600;
let timerStarted = false;
let timerInterval = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }

  if (sceneStarted) return;
  sceneStarted = true;

  const uid = user.uid;
  const hostRef = ref(db, `rooms/${roomCode}`);
  await onDisconnect(hostRef).remove();

  startSceneFlow();
});

async function fetchAndShowPlayers(retry = 0) {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = "";

  const roomRef = ref(db, `rooms/${roomCode}`);
  const roomSnap = await get(roomRef);
  if (!roomSnap.exists()) {
    if (retry < 5) {
      setTimeout(() => fetchAndShowPlayers(retry + 1), 500);
    } else {
      alert("ルームが見つかりませんでした（タイムアウト）");
      window.location.href = "index.html";
    }
    return;
  }

  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const playersSnap = await get(playersRef);
  if (!playersSnap.exists()) {
    if (retry < 5) {
      setTimeout(() => fetchAndShowPlayers(retry + 1), 500);
    } else {
      alert("プレイヤー情報が見つかりませんでした（タイムアウト）");
      window.location.href = "index.html";
    }
    return;
  }

  const players = playersSnap.val();
  const shuffled = Object.values(players).sort(() => Math.random() - 0.5);

  shuffled.forEach((player, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${player.name || "名無し"}`;
    playerList.appendChild(li);
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    window.location.href = "index.html";
  }
});

const roomRef = ref(db, `rooms/${roomCode}`);
onValue(roomRef, (snapshot) => {
  if (!snapshot.exists()) {
    alert("ホストがルームを解散したため、ゲームを終了します");
    window.location.href = "index.html";
  }
});

function startCountdown() {
  if (timerStarted) return;
  timerStarted = true;

  const timerDisplay = document.getElementById("countdownTimer");

  timerInterval = setInterval(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    if (remainingSeconds <= 0) {
  clearInterval(timerInterval);
  triggerStoryOutput(); // ✅ タイマーがゼロで出力
}
 else {
      remainingSeconds--;
    }
  }, 1000);
}
function generateStoryTemplate() {
  const COMMON_LENGTH = 20; // 全入力欄に適用する文字数制限

  const templates = [
    `朝起きると、台所から[blank]の音が聞こえた。<br>
     食卓にはいつも通り、[blank]が並んでいた。<br>
     母は笑いながら「[blank]」と言った。<br>
     でも、昨日も全く同じことを言っていた気がした。<br>
     テレビをつけると、画面には[blank]がずっと映っていた。<br>
     父が読んでいる新聞の日付が[blank]だった。<br>
     そして、[blank]がリビングに降りてきた瞬間、私は黙って立ち上がった。<br>
     だって、[blank]は、昨日の夜に[blank]から戻ってきていないはずだから。`,

    `深夜、部屋の窓の外に[blank]が立っていた。<br>
     なぜか手には[blank]を持っている。<br>
     スマホを見ると、通知には「[blank]」とだけ書かれたメッセージ。<br>
     時計の針は[blank]を指していた。<br>
     階下からは[blank]の音。<br>
     [blank]の名前を呼ぶ声が聞こえるが、そんな人は家にいない。`
  ];

  const selected = templates[Math.floor(Math.random() * templates.length)];

  return selected
    .split("<br>")
    .map(line =>
      `<div class="line">${line.replace(/\[blank\]/g, () =>
        `<input type="text" class="fill-blank" maxlength="${COMMON_LENGTH}" />`
      )}</div>`
    )
    .join("");
}

function startSceneFlow() {
  const overlay = document.getElementById("fadeOverlay");
  const playerList = document.getElementById("playerList");
  const textboxContainer = document.getElementById("textboxContainer");
  const bottomUI = document.getElementById("bottomUI");
  const readyButton = document.getElementById("readyButton");

  let step = 0;

  const onTransitionEnd = async () => {
    switch (step) {
      case 0:
        overlay.style.pointerEvents = "none";
        await fetchAndShowPlayers();
        step = 1;

        setTimeout(() => {
          overlay.style.pointerEvents = "auto";
          overlay.style.opacity = "1";
        }, 3000);
        break;

      case 1:
        const actionTitle = document.getElementById("actionTitle");
        if (actionTitle) actionTitle.remove();

        playerList.style.position = "absolute";
        playerList.style.top = "10px";
        playerList.style.left = "10px";
        playerList.style.fontSize = "14px";
        playerList.style.padding = "5px";
      // ★ テキストテンプレートを挿入
const storyTemplate = document.getElementById("storyTemplate");
storyTemplate.innerHTML = generateStoryTemplate();
textboxContainer.style.display = "block";


        bottomUI.style.display = "flex";         // ✅ ボタンとタイマーを表示

        startCountdown(); // ✅ タイマー開始

        // ✅ 「準備OK」ボタン処理
        readyButton.addEventListener("click", async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;

          await set(ref(db, `rooms/${roomCode}/players/${uid}/ready`), true);
          readyButton.classList.add("disabled");
        });

        // ✅ 準備完了を監視（全員readyなら出力）
        onValue(ref(db, `rooms/${roomCode}/players`), (snapshot) => {
          const players = snapshot.val();
          if (!players) return;

          const allReady = Object.values(players).every(p => p.ready);
          if (allReady) {
            triggerStoryOutput(); // ✅ 出力処理を呼び出し
          }
        });

        overlay.style.opacity = "0"; // ✅ フェードアウトして表示開始
        step = 2;
        break;

      case 2:
        overlay.style.pointerEvents = "none";
        overlay.removeEventListener("transitionend", onTransitionEnd);
        break;
    }
  };

  overlay.addEventListener("transitionend", onTransitionEnd);

  // 最初のフェードイン解除
  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 100);
}

let storyAlreadyOutput = false;
function triggerStoryOutput() {
  if (storyAlreadyOutput) return;
  storyAlreadyOutput = true;

  const overlay = document.getElementById("fadeOverlay");
  const container = document.getElementById("textboxContainer");
  const bottomUI = document.getElementById("bottomUI");
  const playerList = document.getElementById("playerList");
  const videoGrid = document.getElementById("videoGrid");

  // フェードイン（暗転）
  overlay.style.pointerEvents = "auto";
  overlay.style.opacity = "1";

  overlay.addEventListener("transitionend", function handleFadeIn() {
    overlay.removeEventListener("transitionend", handleFadeIn);

    // UIをすべて非表示に
    container.style.display = "none";
    bottomUI.style.display = "none";
    playerList.style.display = "none";

    // 少し待ってフェードアウト（暗転解除）
    setTimeout(() => {
      overlay.style.opacity = "0";

      overlay.addEventListener("transitionend", async function handleFadeOut() {
        overlay.removeEventListener("transitionend", handleFadeOut);
        overlay.style.pointerEvents = "none";

        // ✅ カメラをスタート
        videoGrid.style.display = "flex";
        await startCameraForCurrentUser(); // 👈 この関数を次で定義
      });
    }, 1000);
  });
}
async function startCameraForCurrentUser() {
  const videoGrid = document.getElementById("videoGrid");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

    const video = document.createElement("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // 自分の映像はミュート
    video.style.width = "200px";
    video.style.margin = "10px";
    video.style.border = "2px solid white";

    videoGrid.appendChild(video);
  } catch (err) {
    console.error("カメラの取得に失敗しました:", err);
    alert("カメラにアクセスできませんでした");
  }
}
const peerConnections = {}; // uidごとにRTCPeerConnectionを保存
let localStream = null;
async function startCameraAndConnect() {
  // ✅ まずカメラを取得
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

  const video = document.createElement("video");
  video.srcObject = localStream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.style.width = "200px";
  video.style.margin = "10px";

  document.getElementById("videoGrid").appendChild(video);

  // ✅ 他プレイヤーの一覧を取得して接続開始
  const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
  const players = playersSnap.val();
  const myUID = auth.currentUser.uid;

  for (const [uid, player] of Object.entries(players)) {
    if (uid === myUID) continue;
    createConnectionWith(uid);
  }

  // ✅ シグナリングを監視
  listenForSignals();
}
async function createConnectionWith(remoteUID) {
  const pc = new RTCPeerConnection();

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    const remoteVideo = document.createElement("video");
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    remoteVideo.style.width = "200px";
    remoteVideo.style.margin = "10px";
    document.getElementById("videoGrid").appendChild(remoteVideo);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const signalRef = ref(db, `rooms/${roomCode}/signals/${auth.currentUser.uid}/${remoteUID}/candidates`);
      const newRef = push(signalRef);
      set(newRef, event.candidate.toJSON());
    }
  };

  // ✅ Offerを作って送信
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await set(ref(db, `rooms/${roomCode}/signals/${auth.currentUser.uid}/${remoteUID}/offer`), offer.toJSON());

  peerConnections[remoteUID] = pc;
}
function listenForSignals() {
  const myUID = auth.currentUser.uid;
  const signalsRef = ref(db, `rooms/${roomCode}/signals`);

  onValue(signalsRef, async (snapshot) => {
    const allSignals = snapshot.val();
    if (!allSignals) return;

    for (const [fromUID, signalToMap] of Object.entries(allSignals)) {
      if (fromUID === myUID) continue;

      const signal = signalToMap[myUID];
      if (!signal) continue;

      let pc = peerConnections[fromUID];
      if (!pc) {
        pc = new RTCPeerConnection();
        peerConnections[fromUID] = pc;

        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        pc.ontrack = (event) => {
          const remoteVideo = document.createElement("video");
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.autoplay = true;
          remoteVideo.playsInline = true;
          remoteVideo.style.width = "200px";
          remoteVideo.style.margin = "10px";
          document.getElementById("videoGrid").appendChild(remoteVideo);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const signalRef = ref(db, `rooms/${roomCode}/signals/${myUID}/${fromUID}/candidates`);
            const newRef = push(signalRef);
            set(newRef, event.candidate.toJSON());
          }
        };
      }

      if (signal.offer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await set(ref(db, `rooms/${roomCode}/signals/${myUID}/${fromUID}/answer`), answer.toJSON());
      }

      if (signal.answer && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      }

      if (signal.candidates) {
        for (const candidate of Object.values(signal.candidates)) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("ICE candidate error:", e);
          }
        }
      }
    }
  });
}



