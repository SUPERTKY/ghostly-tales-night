import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase, ref, set, onValue, get, onDisconnect  // ← ✅ ここに onDisconnect を追加
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// Firebase初期化
const firebaseConfig = {
  apiKey: "AIzaSyB1hyrktLnx7lzW2jf4ZeIzTrBEY-IEgPo",
  authDomain: "horror-game-9b2d2.firebaseapp.com",
  databaseURL: "https://horror-game-9b2d2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "horror-game-9b2d2",
  storageBucket: "horror-game-9b2d2.firebasestorage.app",
  messagingSenderId: "534762448588",
  appId: "1:534762448588:web:e0a6a01cd14c7f1dce4469"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);

// 要素取得
const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");
const submitJoin = document.getElementById("submitJoin");
const cancelJoin = document.getElementById("cancelJoin");
const joinInput = document.getElementById("joinRoomCode");
const joinUI = document.getElementById("joinRoomUI");
const roomInfo = document.getElementById("roomInfo");
const playerList = document.getElementById("playerList");
const startBtn = document.getElementById("startBtn");

function disableBothButtons() {
  createBtn.classList.add("disabled");
  joinBtn.classList.add("disabled");
}

function enableBothButtons() {
  createBtn.classList.remove("disabled");
  joinBtn.classList.remove("disabled");
}

function disableJoinButton() {
  joinBtn.classList.add("disabled");
}

function disableCreateButton() {
  createBtn.classList.add("disabled");
}

// 状態変数
let myUID = null;
let currentRoomCode = null;

// 状態管理
const appState = {
  isCreating: false,
  isJoining: false,
  hasJoined: false,
  hasCreated: false
};

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
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

async function createRoomAndJoin(uid) {
　disableCreateButton();
  disableJoinButton();// ✅ ルーム作成後は「参加」ボタンを無効に

  if (appState.hasCreated || appState.hasJoined || appState.isCreating || appState.isJoining) return;

  appState.isCreating = true;
  createBtn.disabled = true;
  joinBtn.disabled = true;

  const playerName = localStorage.getItem("playerName") || "名無し";

  // 空いてるコード探す
  let roomCode;
  while (true) {
    const codeCandidate = generateRoomCode();
    const exists = await get(ref(db, `rooms/${codeCandidate}`));
    if (!exists.exists()) {
      roomCode = codeCandidate;
      break;
    }
  }

  currentRoomCode = roomCode;

  // ✅ まずルーム作成
  await set(ref(db, `rooms/${roomCode}`), {
    createdAt: Date.now(),
    status: "waiting",
    host: uid
  });

  // ✅ プレイヤー登録
  await set(ref(db, `rooms/${roomCode}/players/${uid}`), {
    uid,
    name: playerName
  });

  // ✅ 🔥ここでonDisconnect設定（正しいタイミング）
  const hostRef = ref(db, `rooms/${roomCode}`);
  // onDisconnect 削除 → game開始前にはキャンセル
await onDisconnect(hostRef).cancel();


  // ✅ ルーム削除監視（全員）
  onValue(ref(db, `rooms/${roomCode}`), snapshot => {
    if (!snapshot.exists()) {
      alert("ホストがルームを解散しました");
      window.location.href = "index.html";
    }
  });

  // 表示処理など
  roomInfo.innerHTML = `ルーム番号：<strong>${roomCode}</strong><br>参加者一覧：`;
  onValue(ref(db, `rooms/${roomCode}/players`), snapshot => {
    displayPlayers(snapshot.val());
  });

  appState.hasCreated = true;
  appState.isCreating = false;
  startBtn.style.display = "block";
  onValue(ref(db, `rooms/${currentRoomCode}/status`), (snapshot) => {
  if (snapshot.val() === "started") {
    // フェード演出＋移動
    const overlay = document.getElementById("fadeOverlay");
    overlay.style.opacity = "1";

    setTimeout(() => {
      window.location.href = "game.html"; // 遷移先に変更
    }, 1500); // フェード完了後に遷移
  }
});
}


async function joinRoom(code, uid) {
  if (appState.hasJoined || appState.hasCreated || appState.isCreating || appState.isJoining) return;

  appState.isJoining = true;

  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    alert("そのルームは存在しません");
    appState.isJoining = false;
    return;
  }

  const playersSnap = await get(ref(db, `rooms/${code}/players`));
  const players = playersSnap.val() || {};
  if (Object.keys(players).length >= 6) {
    alert("このルームは満員です！");
    appState.isJoining = false;
    return;
  }

  await set(ref(db, `rooms/${code}/players/${uid}`), {
    uid,
    name: localStorage.getItem("playerName") || "名無し"
  });

  roomInfo.innerHTML = `ルーム番号：<strong>${code}</strong><br>参加者一覧：`;

  onValue(ref(db, `rooms/${code}/players`), snapshot => {
    displayPlayers(snapshot.val());
  });

  joinUI.style.display = "none";
  appState.hasJoined = true;
  appState.isJoining = false;
    // 🔍 参加者も "started" を監視
  onValue(ref(db, `rooms/${code}/status`), (snapshot) => {
    if (snapshot.val() === "started") {
      const overlay = document.getElementById("fadeOverlay");
      overlay.style.opacity = "1";

      setTimeout(() => {
        window.location.href = `game.html?roomCode=${code}`;
      }, 1500);
    }
  });

}

// 認証とボタン制御
onAuthStateChanged(auth, async user => {
  if (user) {
    myUID = user.uid;
    if (!appState.hasCreated && !appState.hasJoined) {
      createBtn.disabled = false;
      joinBtn.disabled = false;
    }
  } else {
    await signInAnonymously(auth);
  }
});

// イベント設定
createBtn.addEventListener("click", () => {
  createRoomAndJoin(myUID);
});

joinBtn.addEventListener("click", () => {
  if (appState.hasCreated || appState.hasJoined) return;
  joinUI.style.display = "block";
  createBtn.disabled = true;
  joinBtn.disabled = true;
});

cancelJoin.addEventListener("click", () => {
  joinUI.style.display = "none";
  joinInput.value = "";
  if (!appState.hasCreated && !appState.hasJoined) {
    createBtn.disabled = false;
    joinBtn.disabled = false;
  }
});

submitJoin.addEventListener("click", () => {
  const code = joinInput.value.trim();
  if (!code) {
    alert("ルーム番号を入力してください");
    return;
  }
  joinRoom(code, myUID);
});

startBtn.addEventListener("click", async () => {
  console.log("現在のルームコード:", currentRoomCode);

  // 🔊 効果音
  const sound = document.getElementById("startSound");
  sound.play();

  // ✅ 🔥 onDisconnect の削除予約をキャンセル
  const hostRef = ref(db, `rooms/${currentRoomCode}`);
  await onDisconnect(hostRef).cancel();  // 🔥 これが重要

  // ✅ ステータスを "started" に変更
  await set(ref(db, `rooms/${currentRoomCode}/status`), "started");

  // ✅ 少し遅らせてから遷移（音が鳴り終わる＋フェード演出など）
  const overlay = document.getElementById("fadeOverlay");
  overlay.style.opacity = "1";

  setTimeout(() => {
    window.location.href = `game.html?roomCode=${currentRoomCode}`;
  }, 1500);
});
const bgm = document.getElementById("bgm");

// ページロード後、ユーザーのクリックなどで再生を保証
document.addEventListener("click", () => {
  bgm.play().catch(e => {
    console.warn("音楽の再生に失敗:", e);
  });
}, { once: true }); // 1回だけ実行

window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("fadeOverlay");

  // フェードアウト開始（例: 100ms後）
  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 100);

  // 完全に透明になったらポインターイベントを無効化
  overlay.addEventListener("transitionend", () => {
    overlay.style.pointerEvents = "none";
  });
});
