

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
let isPageUnloading = false;

// 🔧 修正版：スマートなセッションクリーンアップ（プレイヤー情報は保持）
async function smartCleanupSession(uid) {
  try {
    console.log("🔍 セッション状態を確認中...");
    
    // 1. 現在のプレイヤー情報を確認
    const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);
    const playerSnap = await get(playerRef);
    
    if (!playerSnap.exists()) {
      console.log("✅ クリーンアップ不要：プレイヤー情報なし");
      return;
    }
    
    const playerData = playerSnap.val();
    const now = Date.now();
    
    // 2. セッションが古いかどうかを判定
    const sessionAge = now - (playerData.joinedAt || 0);
    const isOldSession = sessionAge > 30000; // 30秒以上前のセッション
    
    // 3. 重複セッションの検出
    const isDuplicateSession = await detectDuplicateSession(uid);
    
    // 4. 削除条件の判定
    const shouldCleanup = isOldSession || isDuplicateSession;
    
    if (!shouldCleanup) {
      console.log("✅ クリーンアップ不要：有効なセッション");
      return;
    }
    
    console.log("🧹 古いシグナリング情報のみ削除中...");
    
    // 5. 古いシグナリング情報のみ削除（プレイヤー情報は保持）
    await cleanupOldSignalingData(uid);
    
    console.log("✅ 古いシグナリング情報クリーンアップ完了");
    
  } catch (error) {
    console.error("セッションクリーンアップエラー:", error);
  }
}

// 重複セッション検出関数
async function detectDuplicateSession(uid) {
  try {
    // プレイヤーの最終アクティブ時間をチェック
    const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);
    const playerSnap = await get(playerRef);
    
    if (!playerSnap.exists()) {
      return false;
    }
    
    const playerData = playerSnap.val();
    const lastSeen = playerData.lastSeen || 0;
    const timeSinceLastSeen = Date.now() - lastSeen;
    
    // 5分以上非アクティブなら古いセッションとみなす
    return timeSinceLastSeen > 300000;
    
  } catch (error) {
    console.error("重複セッション検出エラー:", error);
    return false;
  }
}

// 古いシグナリングデータのみを削除
async function cleanupOldSignalingData(uid) {
  try {
    // シグナリング情報の削除（これは削除してOK）
    const signalRef = ref(db, `rooms/${roomCode}/signals/${uid}`);
    const signalSnap = await get(signalRef);
    if (signalSnap.exists()) {
      await set(signalRef, null);
      console.log("📡 古いシグナリング情報を削除しました");
    }

    // 他のプレイヤーからのシグナリング情報も削除
    const allSignalsSnap = await get(ref(db, `rooms/${roomCode}/signals`));
    if (allSignalsSnap.exists()) {
      const allSignals = allSignalsSnap.val();
      for (const [fromUID, toMap] of Object.entries(allSignals)) {
        if (toMap && toMap[uid]) {
          await set(ref(db, `rooms/${roomCode}/signals/${fromUID}/${uid}`), null);
          console.log(`📡 ${fromUID}からの古いシグナリング情報を削除しました`);
        }
      }
    }
    
    // ⚠️ 重要：プレイヤー情報は削除しない！
    
  } catch (error) {
    console.error("古いシグナリングデータ削除エラー:", error);
  }
}

// 🔧 新規追加：プレイヤー情報の適切な更新
async function updatePlayerInfo(uid) {
  try {
    console.log("👤 プレイヤー情報を更新中...");
    
    const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);
    
    // 現在のプレイヤー情報を取得
    const playerSnap = await get(playerRef);
    let playerData = {};
    
    if (playerSnap.exists()) {
      // 既存の情報を保持
      playerData = playerSnap.val();
      console.log("📝 既存のプレイヤー情報を保持");
    } else {
      // 新規プレイヤーの場合、基本情報を設定
      playerData = {
        name: `プレイヤー${Math.floor(Math.random() * 1000)}`,
      };
      console.log("🆕 新規プレイヤー情報を作成");
    }
    
    // セッション情報を更新
    const updatedPlayerData = {
      ...playerData,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      sessionId: generateSessionId(),
      status: 'online',
      ready: false // readyステートをリセット
    };
    
    await set(playerRef, updatedPlayerData);
    console.log("✅ プレイヤー情報更新完了");
    
  } catch (error) {
    console.error("プレイヤー情報更新エラー:", error);
  }
}

// セッションID生成
function generateSessionId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 🔧 新規追加：WebRTC接続のクリーンアップ関数
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
    Object.keys(candidateQueues).forEach(key => {
      delete candidateQueues[key];
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

// 🔧 新規追加：適切な終了処理関数
async function gracefulShutdown() {
  if (isCleaningUp) return;
  isCleaningUp = true;
  
  try {
    console.log("🏁 アプリケーション終了処理を開始...");
    
    // 1. WebRTC接続のクリーンアップ
    await cleanupWebRTCConnections();
    
    // 2. シグナリング情報のクリーンアップ（プレイヤー情報は保持）
    if (currentUserId) {
      await cleanupOldSignalingData(currentUserId);
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

// onAuthStateChanged を含むところ
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }

  if (sceneStarted) return;
  sceneStarted = true;

  const uid = user.uid;
  currentUserId = uid;

  // 🔁 🔧 認証後にルームが存在するかを retry しながら確認する（最大10回）
  for (let i = 0; i < 10; i++) {
    const roomSnap = await get(ref(db, `rooms/${roomCode}`));
    if (roomSnap.exists()) break;

    console.warn(`🔁 [${i}] ルーム情報がまだ見つかりません。再試行中...`);
    await new Promise(r => setTimeout(r, 500)); // 0.5秒待つ
    if (i === 9) {
      alert("ルーム情報が見つかりません（再接続失敗）");
      window.location.href = "index.html";
      return;
    }
  }

  // この後に通常の処理を続行
  await smartCleanupSession(uid);
  await updatePlayerInfo(uid);

  const hostSnap = await get(ref(db, `rooms/${roomCode}/host`));
  const hostUID = hostSnap.exists() ? hostSnap.val() : null;

  if (uid === hostUID) {
    await onDisconnect(ref(db, `rooms/${roomCode}`)).remove();
  } else {
    await onDisconnect(ref(db, `rooms/${roomCode}/players/${uid}`)).remove();
  }

  startSceneFlow();
});


// 🔧 新規追加：beforeunloadイベント
window.addEventListener("beforeunload", async (event) => {
  isPageUnloading = true;
  await gracefulShutdown();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && !isPageUnloading) {
    console.warn("⚠️ ページが非表示になりました（タブ切り替えなど）");
    // 以前はここでタイマーを停止していましたが、
    // タブを切り替えてもタイマーが止まらないように変更
  } else if (document.visibilityState === "visible") {
    console.log("👁️ ページが再表示されました");
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

  // 🔧 認証後の反映待ちのため、ここで delay を追加
  setTimeout(async () => {
    await fetchAndShowPlayers();
  }, 500); // 500〜1000msが目安

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
        showStoryTemplate();
        startCountdown();

        readyButton.addEventListener("click", async () => {
          const uid = auth.currentUser?.uid;
          if (!uid) return;
          await set(ref(db, `rooms/${roomCode}/players/${uid}/ready`), true);
          readyButton.classList.add("disabled");
          if (!cameraStarted) {
            await startCameraAndConnect();
          }
        });

        onValue(ref(db, `rooms/${roomCode}/players`), (snapshot) => {
          const players = snapshot.val();
          if (!players) return;

          const allReady = Object.values(players).every(p => p.ready);
          if (allReady) {
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
              timerStarted = false;
            }
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
let currentStoryTemplate = ""; // store template to avoid regeneration
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

        // ✅ 怪談を出力（テンプレートは保持のみ）
        if (!currentStoryTemplate) {
          currentStoryTemplate = generateStoryTemplate();
          console.log("🎃 出力テンプレート:", currentStoryTemplate);
        }

        container.innerHTML = "";
        container.style.display = "none";

        videoGrid.style.display = "flex";
        await startCameraAndConnect();
      });
    }, 1000);
  });
}


const peerConnections = {};
const remoteStreams = {};
const candidateQueues = {};
let localStream = null;
let cameraStarted = false;

async function startCameraAndConnect() {
  if (cameraStarted) {
    console.log("📷 カメラは既に起動しています");
    return;
  }
  cameraStarted = true;
  try {
    // 🔧 追加：開始前に既存の接続をクリーンアップ
    await cleanupWebRTCConnections();
    
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

    const videoGrid = document.getElementById("videoGrid");
    videoGrid.style.display = "flex"; // 🎥 ビデオ領域を表示

    const video = document.createElement("video");
    video.srcObject = localStream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.style.width = "200px";
    video.style.height = "150px";
    video.style.margin = "10px";
    videoGrid.appendChild(video);
    await video.play().catch(e => console.warn("ローカル再生エラー:", e));

    console.log("📷 ローカルカメラ取得完了");

    await set(ref(db, `rooms/${roomCode}/players/${auth.currentUser.uid}/cameraReady`), true);

    const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
    const players = playersSnap.val() || {};

    const myUID = auth.currentUser.uid;
    for (const [uid, info] of Object.entries(players)) {
      if (uid === myUID) continue;

      if (info.cameraReady && !peerConnections[uid]) {
        console.log("🛰️ 接続開始 to:", uid);
        await createConnectionWith(uid);
      }
    }

    listenForSignals();
    listenForCameraReadyPlayers();
  } catch (err) {
    console.error("カメラ取得エラー:", err);
    alert("カメラの許可が必要です。他のアプリを閉じてください。");
  }
}

function listenForCameraReadyPlayers() {
  const myUID = auth.currentUser.uid;
  const playersRef = ref(db, `rooms/${roomCode}/players`);

  onValue(playersRef, async (snapshot) => {
    const players = snapshot.val() || {};
    for (const [uid, info] of Object.entries(players)) {
      if (uid === myUID) continue;

      if (info.cameraReady && !peerConnections[uid]) {
        console.log("🛰️ カメラ準備完了を検知、接続開始 to:", uid);
        await createConnectionWith(uid);
      }
    }
  });
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

  candidateQueues[remoteUID] = [];

  // 🔧 追加：接続状態の監視
  pc.onconnectionstatechange = () => {
    console.log(`🔗 ${remoteUID}との接続状態: ${pc.connectionState}`);
    
    if (pc.connectionState === 'failed') {
      console.warn(`❌ ${remoteUID}との接続に失敗しました`);
    }
  };

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

// 🔧 完全な pc.ontrack 置き換え版
// 元のpc.ontrack = (event) => { から }; までを、以下で置き換えてください

pc.ontrack = (event) => {
  const stream = event.streams[0];
  if (!stream) return;

  // 🔧 修正：remoteUIDを正しく特定
  const remoteUID = Object.keys(peerConnections).find(uid => peerConnections[uid] === pc) || 'unknown';
  
  const track = stream.getVideoTracks()[0];
  console.log("🎥 映像を受信 from", remoteUID);
  console.log("📺 stream:", stream);
console.log("📺 videoTrack state:", track ? track.readyState : 'トラックなし');
console.log("📺 videoTrack enabled:", track ? track.enabled : 'トラックなし');
console.log("📺 videoTrack label:", track ? track.label : 'トラックなし');
  console.log("📺 stream track count:", stream.getTracks().length);

  const videoGrid = document.getElementById("videoGrid");
  videoGrid.style.display = "flex";

  // 既存のリモートビデオを削除
  const existingRemoteVideo = document.querySelector(`video[data-user-id="${remoteUID}"]`);
  if (existingRemoteVideo) {
    console.log(`🗑️ ${remoteUID}の既存ビデオを削除`);
    existingRemoteVideo.remove();
  }

  // 新しいリモートビデオ要素を作成
  const remoteVideo = document.createElement("video");
  remoteVideo.setAttribute("data-user-id", remoteUID);
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;
  remoteVideo.muted = true;
  remoteVideo.style.width = "200px";
  remoteVideo.style.height = "150px";
  remoteVideo.style.margin = "10px";
  remoteVideo.style.border = "3px solid #00ff00"; // 緑枠でリモートを識別
  remoteVideo.style.borderRadius = "8px";

  // ストリームを直接設定
 remoteVideo.load(); // 追加
  
  // DOMに追加
  videoGrid.appendChild(remoteVideo);
  console.log(`📺 ${remoteUID}のビデオ要素をDOMに追加`);

  // 再生イベントリスナー
  remoteVideo.onloadedmetadata = () => {
    console.log(`📺 ${remoteUID}のメタデータ読み込み完了`);
  };

  remoteVideo.onplay = () => {
    console.log(`▶️ ${remoteUID}のビデオ再生開始`);
  };

  remoteVideo.onerror = (error) => {
    console.error(`❌ ${remoteUID}のビデオエラー:`, error);
  };

  // 再生を試行
  remoteVideo.play()
    .then(() => {
      console.log(`✅ ${remoteUID}のビデオ再生成功`);
    })
    .catch(err => {
      console.warn(`⚠️ ${remoteUID}のビデオ再生失敗:`, err);
      
      // 手動再生ボタンを追加
      const playButton = document.createElement("button");
      playButton.textContent = `${remoteUID}の映像を再生`;
      playButton.style.position = "absolute";
      playButton.style.zIndex = "1000";
      playButton.style.backgroundColor = "#00ff00";
      playButton.style.color = "black";
      playButton.style.padding = "8px 12px";
      playButton.style.border = "none";
      playButton.style.borderRadius = "5px";
      playButton.style.cursor = "pointer";
      playButton.style.margin = "10px";
      
      playButton.onclick = () => {
        remoteVideo.play()
          .then(() => {
            playButton.remove();
            console.log(`✅ ${remoteUID}の手動再生成功`);
          })
          .catch(err2 => {
            console.error(`❌ ${remoteUID}の手動再生も失敗:`, err2);
          });
      };
      
      videoGrid.appendChild(playButton);
    });
};
// 🔧 新規追加：手動再生ボタン関数
function addPlayButton(videoElement, userId) {
  // 既存のボタンがあれば削除
  const existingButton = document.querySelector(`button[data-video-id="${userId}"]`);
  if (existingButton) {
    existingButton.remove();
  }

  const playButton = document.createElement("button");
  playButton.textContent = `${userId}の映像を再生`;
  playButton.setAttribute("data-video-id", userId);
  playButton.style.position = "absolute";
  playButton.style.zIndex = "1000";
  playButton.style.backgroundColor = "#00ff00";
  playButton.style.color = "black";
  playButton.style.padding = "5px 10px";
  playButton.style.border = "none";
  playButton.style.borderRadius = "5px";
  playButton.style.cursor = "pointer";
  
  playButton.onclick = () => {
    videoElement.play()
      .then(() => {
        playButton.remove();
        console.log(`✅ ${userId}の手動再生成功`);
      })
      .catch(err => {
        console.error(`❌ ${userId}の手動再生失敗:`, err);
        alert(`${userId}の映像再生に失敗しました: ${err.message}`);
      });
  };
  
  // ビデオ要素の後に挿入
  videoElement.parentNode.insertBefore(playButton, videoElement.nextSibling);
}

// 🔧 新規追加：手動再生ボタン関数
function addPlayButton(videoElement, userId) {
  // 既存のボタンがあれば削除
  const existingButton = document.querySelector(`button[data-video-id="${userId}"]`);
  if (existingButton) {
    existingButton.remove();
  }

  const playButton = document.createElement("button");
  playButton.textContent = `${userId}の映像を再生`;
  playButton.setAttribute("data-video-id", userId);
  playButton.style.position = "absolute";
  playButton.style.zIndex = "1000";
  playButton.style.backgroundColor = "#00ff00";
  playButton.style.color = "black";
  playButton.style.padding = "5px 10px";
  playButton.style.border = "none";
  playButton.style.borderRadius = "5px";
  playButton.style.cursor = "pointer";
  
  playButton.onclick = () => {
    videoElement.play()
      .then(() => {
        playButton.remove();
        console.log(`✅ ${userId}の手動再生成功`);
      })
      .catch(err => {
        console.error(`❌ ${userId}の手動再生失敗:`, err);
        alert(`${userId}の映像再生に失敗しました: ${err.message}`);
      });
  };
  
  // ビデオ要素の後に挿入
  videoElement.parentNode.insertBefore(playButton, videoElement.nextSibling);
}

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
        candidateQueues[fromUID] = candidateQueues[fromUID] || [];

        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });



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

        for (const c of candidateQueues[fromUID]) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {
            console.error("ICE candidate error:", e);
          }
        }
        candidateQueues[fromUID] = [];

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

        for (const c of candidateQueues[fromUID]) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch (e) {
            console.error("ICE candidate error:", e);
          }
        }
        candidateQueues[fromUID] = [];
      }

      if (signal.candidates) {
        for (const candidate of Object.values(signal.candidates)) {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("✅ ICE candidate 受信 from:", fromUID);
            } else {
              candidateQueues[fromUID].push(candidate);
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

  try {
    const roomSnap = await get(ref(db, `rooms/${roomCode}`));
    if (!roomSnap.exists()) {
      console.warn(`[${retry}] ルーム情報が見つかりません`);
      if (retry < 10) {
        setTimeout(() => fetchAndShowPlayers(retry + 1), 1000); // 500ms → 1000msに拡張
      } else {
        alert("ルームが見つかりませんでした（タイムアウト）");
        window.location.href = "index.html";
      }
      return;
    }

    const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
    if (!playersSnap.exists()) {
      console.warn(`[${retry}] プレイヤー情報が見つかりません`);
      if (retry < 10) {
        setTimeout(() => fetchAndShowPlayers(retry + 1), 1000); // retry数と遅延強化
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

  } catch (error) {
    console.error("❌ fetchAndShowPlayers中にエラー:", error);
    if (retry < 10) {
      setTimeout(() => fetchAndShowPlayers(retry + 1), 1000);
    } else {
      alert("ルームまたはプレイヤー情報の取得に失敗しました（タイムアウト）");
      window.location.href = "index.html";
    }
  }
}


function generateStoryTemplate() {
  const COMMON_LENGTH = 20;

  const templates = [
    `朝起きると、台所から[blank]の音が聞こえた。<br>
     食卓にはいつも通り、[blank]が並んでいた。<br>
     母は笑いながら「[blank]」と言った。<br>
     でも、昨日も全く同じことを言っていた気がした。<br>
     テレビをつけると、画面には[blank]がずっと映っていた。<br>
     父が読んでいる新聞の日付が[blank]だった。<br>
     そして、[blank]がリビングに降りてきた瞬間、私は黙って立ち上がった。<br>
     だって、[blank]は、昨日の夜に[blank]から戻ってきていないはずだから。`
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

function showStoryTemplate() {
  const container = document.getElementById("textboxContainer");
  const playerList = document.getElementById("playerList");
  const actionTitle = document.getElementById("actionTitle");
  currentStoryTemplate = generateStoryTemplate();

  if (playerList) playerList.style.display = "none";
  if (actionTitle) actionTitle.style.display = "none";

  container.innerHTML = `
    <h2 style="font-size: 28px; margin-bottom: 20px;">あなたの怪談を完成させましょう</h2>
    <div id="storyTemplate">${currentStoryTemplate}</div>
  `;

  container.style.display = "block";
  window.scrollTo({ top: container.offsetTop, behavior: 'smooth' });
}
