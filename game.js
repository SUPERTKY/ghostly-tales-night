
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

const params = new URLSearchParams(location.search);
const roomCode = params.get("roomCode");

if (!roomCode) {
  alert("ルーム情報が見つかりませんでした");
  window.location.href = "index.html";
  throw new Error("ルームコードなし");
}

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
// 🔧 追加：セッション管理用変数
let currentUserId = null;
let isCleaningUp = false;

// 🔧 新規追加：既存セッションクリーンアップ関数
async function cleanupExistingSession(uid) {
  try {
    console.log("🧹 既存セッションをクリーンアップ中...");
    
    // 1. プレイヤー情報の削除
    const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);
    const playerSnap = await get(playerRef);
    if (playerSnap.exists()) {
      await set(playerRef, null);
      console.log("👤 既存プレイヤー情報を削除しました");
    }

    // 2. シグナリング情報の削除
    const signalRef = ref(db, `rooms/${roomCode}/signals/${uid}`);
    const signalSnap = await get(signalRef);
    if (signalSnap.exists()) {
      await set(signalRef, null);
      console.log("📡 既存シグナリング情報を削除しました");
    }

    // 3. 他のプレイヤーからのシグナリング情報も削除
    const allSignalsSnap = await get(ref(db, `rooms/${roomCode}/signals`));
    if (allSignalsSnap.exists()) {
      const allSignals = allSignalsSnap.val();
      for (const [fromUID, toMap] of Object.entries(allSignals)) {
        if (toMap && toMap[uid]) {
          await set(ref(db, `rooms/${roomCode}/signals/${fromUID}/${uid}`), null);
          console.log(`📡 ${fromUID}からのシグナリング情報を削除しました`);
        }
      }
    }

    // 4. 少し待機（Firebase側の反映待ち）
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error("セッションクリーンアップエラー:", error);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }

  if (sceneStarted) return;
  sceneStarted = true;

  const uid = user.uid;
  currentUserId = uid; // 🔧 追加：現在のユーザーIDを保存
  
  // 🔧 修正：既存セッションを必ずクリーンアップ
  await cleanupExistingSession(uid);
  
  const hostSnap = await get(ref(db, `rooms/${roomCode}/host`));
  const hostUID = hostSnap.exists() ? hostSnap.val() : null;

  if (uid === hostUID) {
    await onDisconnect(ref(db, `rooms/${roomCode}`)).remove();
  } else {
    await onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}`)).remove();
  }

  startSceneFlow();
});

// 🔧 修正：ページ離脱処理の改善
let isPageUnloading = false;

// beforeunloadイベント - ページが閉じられる直前
window.addEventListener("beforeunload", async (event) => {
  isPageUnloading = true;
  await gracefulShutdown();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && !isPageUnloading) {
    console.warn("⚠️ ページが非表示になりました（タブ切り替えなど）");
    // 🔧 修正：強制的にページ移動はしない
    // window.location.href = "index.html"; // この行をコメントアウト
    
    // 必要に応じて一時停止処理
    if (timerInterval) {
      clearInterval(timerInterval);
      console.log("⏸️ タイマーを一時停止しました");
    }
  } else if (document.visibilityState === "visible") {
    console.log("👁️ ページが再表示されました");
    
    // タイマー再開処理
    if (timerStarted && !timerInterval && remainingSeconds > 0) {
      startCountdown();
      console.log("▶️ タイマーを再開しました");
    }
  }
});

// 🔧 新規追加：適切な終了処理
async function gracefulShutdown() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  
  try {
    console.log("🏁 アプリケーション終了処理を開始...");
    
    // 1. WebRTC接続のクリーンアップ
    await cleanupWebRTCConnections();
    
    // 2. Firebase接続のクリーンアップ
    if (currentUserId) {
      await cleanupExistingSession(currentUserId);
    }
    
    // 3. タイマーの停止
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    console.log("✅ 終了処理完了");
    
  } catch (error) {
    console.error("終了処理エラー:", error);
  }
}

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

// 🔧 新規追加：WebRTC接続のクリーンアップ
async function cleanupWebRTCConnections() {
  try {
    console.log("🔌 WebRTC接続をクリーンアップ中...");
    
    // 既存のPeerConnection接続をすべて閉じる
    for (const [uid, pc] of Object.entries(peerConnections)) {
      if (pc) {
        pc.close();
        console.log(`🔌 ${uid}への接続を閉じました`);
      }
    }
    
    // PeerConnectionsをクリア
    Object.keys(peerConnections).forEach(key => {
      delete peerConnections[key];
    });

    // ローカルストリームを停止
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log("📷 カメラトラックを停止しました");
      });
      localStream = null;
    }

    // ビデオ要素をすべて削除
    const videoGrid = document.getElementById("videoGrid");
    if (videoGrid) {
      videoGrid.innerHTML = "";
      console.log("📺 ビデオ要素をクリアしました");
    }
    
  } catch (error) {
    console.error("WebRTCクリーンアップエラー:", error);
  }
}

async function startCameraAndConnect() {
  try {
    // 🔧 追加：開始前に既存の接続をクリーンアップ
    await cleanupWebRTCConnections();
    
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

    const video = document.createElement("video");
    video.srcObject = localStream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = "200px";
    video.style.height = "150px";
    video.style.margin = "10px";
    document.getElementById("videoGrid").appendChild(video);
    await video.play().catch(e => console.warn("ローカル再生エラー:", e));

    console.log("📷 ローカルカメラ取得完了");

    await set(ref(db, `rooms/${roomCode}/players/${auth.currentUser.uid}/cameraReady`), true);

    const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
    const players = playersSnap.val();

    for (const uid in players) {
      if (uid !== auth.currentUser.uid) {
        console.log("🛰️ 接続開始 to:", uid);
        await createConnectionWith(uid);
      }
    }

    listenForSignals();
  } catch (err) {
    console.error("カメラ取得エラー:", err);
    alert("カメラの許可が必要です。他のアプリを閉じてください。");
  }
}


async function createConnectionWith(remoteUID) {
  // 🔧 追加：既存の接続があれば閉じる
  if (peerConnections[remoteUID]) {
    peerConnections[remoteUID].close();
    delete peerConnections[remoteUID];
    console.log(`🔌 ${remoteUID}への既存接続を閉じました`);
  }

  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  // 🔧 追加：接続状態の監視
  pc.onconnectionstatechange = () => {
    console.log(`🔗 ${remoteUID}との接続状態: ${pc.connectionState}`);
    
    if (pc.connectionState === 'failed') {
      console.warn(`❌ ${remoteUID}との接続に失敗しました`);
      // 必要に応じて再接続処理
    }
  };

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    console.log("🎥 映像を受信 from", remoteUID);
    
    // 🔧 追加：既存のビデオ要素があれば削除
    const existingVideo = document.querySelector(`[data-user-id="${remoteUID}"]`);
    if (existingVideo) {
      existingVideo.remove();
    }
    
    const remoteVideo = document.createElement("video");
    remoteVideo.setAttribute("data-user-id", remoteUID); // 🔧 追加：識別子を追加
    remoteVideo.srcObject = event.streams[0];
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;
    remoteVideo.style.width = "200px";
    remoteVideo.style.margin = "10px";
    document.getElementById("videoGrid").appendChild(remoteVideo);
    remoteVideo.play().catch(e => console.warn("再生エラー:", e));
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("❄ ICE candidate 送信 to:", remoteUID);
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
  console.log("📡 Offer 送信完了 to:", remoteUID);
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
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        peerConnections[fromUID] = pc;

        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        pc.ontrack = (event) => {
          console.log("🎥 映像を受信 from", fromUID); // 🔧 修正：変数名を統一
          console.log("📺 Track一覧:", event.streams[0].getTracks());
          console.log("📺 VideoTrack readyState:", event.streams[0].getVideoTracks()[0]?.readyState);

          // 🔧 追加：既存のビデオ要素があれば削除
          const existingVideo = document.querySelector(`[data-user-id="${fromUID}"]`);
          if (existingVideo) {
            existingVideo.remove();
          }

          const remoteVideo = document.createElement("video");
          remoteVideo.setAttribute("data-user-id", fromUID); // 🔧 追加：識別子を追加
          remoteVideo.srcObject = event.streams[0];
          remoteVideo.autoplay = true;
          remoteVideo.playsInline = true;
          remoteVideo.style.width = "200px";
          remoteVideo.style.margin = "10px";
          remoteVideo.style.height = "150px";

          document.getElementById("videoGrid").appendChild(remoteVideo);
          remoteVideo.play().catch(e => console.warn("再生エラー:", e));
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("❄ ICE candidate 返信 to:", fromUID);
            const signalRef = ref(db, `rooms/${roomCode}/signals/${myUID}/${fromUID}/candidates`);
            const newRef = push(signalRef);
            set(newRef, event.candidate);
          }
        };
      }

      if (signal.offer && !pc.currentRemoteDescription) {
        console.log("📨 Offer 受信 from:", fromUID);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await set(ref(db, `rooms/${roomCode}/signals/${myUID}/${fromUID}/answer`), {
          type: answer.type,
          sdp: answer.sdp
        });
        console.log("📨 Answer 送信 to:", fromUID);
      }

      if (signal.answer && pc.signalingState !== "stable") {
        console.log("✅ Answer 受信 from:", fromUID);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      }

      if (signal.candidates) {
        for (const candidate of Object.values(signal.candidates)) {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("✅ ICE candidate 受信 from:", fromUID);
            } else {
              console.warn("⚠ ICE candidate を無視（remoteDescription 未設定）:", candidate);
            }
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
    if (retry < 10) {
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
