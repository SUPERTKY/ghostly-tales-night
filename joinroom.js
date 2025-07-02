import {
  getDatabase, ref, set, onValue, get, onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Firebase設定
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

let myUID = null;

// グローバル状態
if (!window.appState) {
  window.appState = {
    isCreating: false,
    isJoining: false,
    isEnteringCode: false,
    hasJoined: false
  };
}

// UI要素
const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");
const submitJoin = document.getElementById("submitJoin");
const cancelJoin = document.getElementById("cancelJoin");
const joinUI = document.getElementById("joinRoomUI");
const joinInput = document.getElementById("joinRoomCode");
const roomInfo = document.getElementById("roomInfo");
const playerList = document.getElementById("playerList");

function disableBothButtons() {
  createBtn.classList.add("disabled");
  joinBtn.classList.add("disabled");
}

function enableBothButtons() {
  createBtn.classList.remove("disabled");
  joinBtn.classList.remove("disabled");
}

function displayPlayers(players) {
  playerList.innerHTML = "";
  Object.values(players || {}).forEach((player, index) => {
    const name = player.name || `プレイヤー${index + 1}`;
    const li = document.createElement("li");
    li.textContent = `・${name}`;
    playerList.appendChild(li);
  });
}

// 「ルームに入る」ボタン
joinBtn.addEventListener("click", () => {
  joinUI.style.display = "block";
  window.appState.isEnteringCode = true;
  disableBothButtons();
});

// 「キャンセル」ボタン
cancelJoin.addEventListener("click", () => {
  joinUI.style.display = "none";
  joinInput.value = "";
  window.appState.isEnteringCode = false;

  if (!window.appState.isCreating && !window.appState.isJoining && !window.appState.hasJoined) {
    enableBothButtons();
  }
});

// 「参加」ボタン
submitJoin.addEventListener("click", async () => {
  if (window.appState.isCreating || window.appState.isJoining || !window.appState.isEnteringCode) return;

  window.appState.isJoining = true;
  disableBothButtons();

  const code = joinInput.value.trim();
  if (!code) {
    alert("コードが未入力です");
    window.appState.isJoining = false;
    enableBothButtons();
    return;
  }

  try {
    const roomRef = ref(db, `rooms/${code}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) throw new Error("そのルームは存在しません");

    const playersSnap = await get(ref(db, `rooms/${code}/players`));
    const players = playersSnap.val() || {};
    if (Object.keys(players).length >= 6) throw new Error("このルームは満員です");

    await set(ref(db, `rooms/${code}/players/${myUID}`), {
      uid: myUID,
      name: localStorage.getItem("playerName") || "名無し"
    });

    // 🔌 切断されたら自分だけ削除
    const playerRef = ref(db, `rooms/${code}/players/${myUID}`);
    await onDisconnect(playerRef).remove();

    // 👀 ルーム全体が消えたらトップに戻す
    onValue(ref(db, `rooms/${code}`), snapshot => {
      if (!snapshot.exists()) {
        alert("ホストがルームを解散しました");
        window.location.href = "index.html";
      }
    });

    // 表示
    roomInfo.innerHTML = `ルーム番号：<strong>${code}</strong><br>参加者一覧：`;
    onValue(ref(db, `rooms/${code}/players`), snap => displayPlayers(snap.val()));

    // 状態更新
    window.appState.isJoining = false;
    window.appState.isEnteringCode = false;
    window.appState.hasJoined = true;

    joinUI.style.display = "none";
    joinInput.value = "";
    disableBothButtons();

  } catch (e) {
    console.error("参加失敗:", e);
    alert(e.message || "参加に失敗しました");
    window.appState.isJoining = false;
    window.appState.isEnteringCode = false;
    enableBothButtons();
  }
});

// 匿名ログイン処理（認証がないとUIDが使えない）
onAuthStateChanged(auth, async user => {
  if (user) {
    myUID = user.uid;
    if (!window.appState.hasJoined) {
      enableBothButtons();
    }
  } else {
    await signInAnonymously(auth);
  }
});
