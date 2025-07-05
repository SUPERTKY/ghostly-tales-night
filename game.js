// Firebaseモジュール読み込み
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase, ref, get, set, onValue, onDisconnect, push
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
      triggerStoryOutput();
    } else {
      remainingSeconds--;
    }
  }, 1000);
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
        playerList.style.position = "absolute";
        playerList.style.top = "10px";
        playerList.style.left = "10px";
        playerList.style.fontSize = "14px";
        playerList.style.padding = "5px";

        textboxContainer.style.display = "block";
        bottomUI.style.display = "flex";
        startCountdown();

        readyButton.addEventListener("click", async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          await set(ref(db, `rooms/${roomCode}/players/${uid}/ready`), true);
          readyButton.classList.add("disabled");
        });

        onValue(ref(db, `rooms/${roomCode}/players`), (snapshot) => {
          const players = snapshot.val();
          if (!players) return;

          const allReady = Object.values(players).every(p => p.ready);
          if (allReady) {
            triggerStoryOutput();
          }
        });

        overlay.style.opacity = "0";
        step = 2;
        break;

      case 2:
        overlay.style.pointerEvents = "none";
        overlay.removeEventListener("transitionend", onTransitionEnd);
        break;
    }
  };

  overlay.addEventListener("transitionend", onTransitionEnd);

  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 100);
}

let storyAlreadyOutput = false;
async function triggerStoryOutput() {
  if (storyAlreadyOutput) return;
  storyAlreadyOutput = true;

  const overlay = document.getElementById("fadeOverlay");
  const container = document.getElementById("textboxContainer");
  const bottomUI = document.getElementById("bottomUI");
  const playerList = document.getElementById("playerList");
  const videoGrid = document.getElementById("videoGrid");

  overlay.style.pointerEvents = "auto";
  overlay.style.opacity = "1";

  overlay.addEventListener("transitionend", function handleFadeIn() {
    overlay.removeEventListener("transitionend", handleFadeIn);
    container.style.display = "none";
    bottomUI.style.display = "none";
    playerList.style.display = "none";

    setTimeout(() => {
      overlay.style.opacity = "0";
      overlay.addEventListener("transitionend", async function handleFadeOut() {
        overlay.removeEventListener("transitionend", handleFadeOut);
        overlay.style.pointerEvents = "none";
        videoGrid.style.display = "flex";
        await startCameraAndConnect();
      });
    }, 1000);
  });
}

const peerConnections = {};
let localStream = null;

async function startCameraAndConnect() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

    const video = document.createElement("video");
    video.srcObject = localStream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = "200px";
    video.style.margin = "10px";

    document.getElementById("videoGrid").appendChild(video);

    // ✅ カメラOKを通知
    await set(ref(db, `rooms/${roomCode}/players/${auth.currentUser.uid}/cameraReady`), true);

    // 残りのP2P接続処理へ
    ...
  } catch (err) {
    console.error("カメラ取得エラー:", err);
    alert("カメラの許可が必要です。他のアプリを閉じてください。");
  }
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
      set(newRef, event.candidate);
    }
  };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await set(ref(db, `rooms/${roomCode}/signals/${auth.currentUser.uid}/${remoteUID}/offer`), {
    type: offer.type,
    sdp: offer.sdp
  });

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
            set(newRef, event.candidate);
          }
        };
      }

      if (signal.offer && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await set(ref(db, `rooms/${roomCode}/signals/${myUID}/${fromUID}/answer`), {
          type: answer.type,
          sdp: answer.sdp
        });
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

async function fetchAndShowPlayers(retry = 0) {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = "";

  const roomSnap = await get(ref(db, `rooms/${roomCode}`));
  if (!roomSnap.exists()) {
    if (retry < 5) {
      setTimeout(() => fetchAndShowPlayers(retry + 1), 500);
    } else {
      alert("ルームが見つかりませんでした（タイムアウト）");
      window.location.href = "index.html";
    }
    return;
  }

  const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
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
