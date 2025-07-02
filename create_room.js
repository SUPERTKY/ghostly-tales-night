import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyB1hyrktLnx7lzW2jf4ZeIzTrBEY-IEgPo",
  authDomain: "horror-game-9b2d2.firebaseapp.com",
  databaseURL: "https://horror-game-9b2d2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "horror-game-9b2d2",
  storageBucket: "horror-game-9b2d2.firebasestorage.app",
  messagingSenderId: "534762448588",
  appId: "1:534762448588:web:e0a6a01cd14c7f1dce4469"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// 🎮 要素取得
const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");
const submitJoin = document.getElementById("submitJoin");
const cancelJoin = document.getElementById("cancelJoin");
const joinInput = document.getElementById("joinRoomCode");
const joinUI = document.getElementById("joinRoomUI");

const roomInfo = document.getElementById("roomInfo");
const playerList = document.getElementById("playerList");

let currentRoomCode = null;
let myUID = null;
let roomCreated = false;
let roomJoined = false;

// 🔢 ランダムなルーム番号を作成
function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// 👤 参加者一覧を表示（名前ベース）
function displayPlayers(players) {
  playerList.innerHTML = "";
  Object.values(players || {}).forEach((player, index) => {
    const name = player.name || `プレイヤー${index + 1}`;
    const li = document.createElement("li");
    li.textContent = `・${name}`;
    playerList.appendChild(li);
  });
}

// 🏠 ルームを作成して自分を参加させる
async function createRoomAndJoin(uid) {
  const playerName = localStorage.getItem("playerName") || "名無し";

  // すでにルームを作っていないかチェック
  const roomsSnapshot = await get(ref(db, "rooms"));
  const rooms = roomsSnapshot.val();
  const alreadyCreatedRoom = Object.entries(rooms || {}).find(([code, room]) => room.host === uid);
  if (alreadyCreatedRoom) {
    alert("すでにルームを作成しています！");
    return;
  }

  // 重複しないルーム番号を生成
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
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);

  await set(roomRef, {
    createdAt: Date.now(),
    status: "waiting",
    host: uid
  });

  await set(playerRef, {
    uid: uid,
    name: playerName
  });

  roomInfo.innerHTML = `ルーム番号：<strong>${roomCode}</strong><br>参加者一覧：`;

  onValue(ref(db, `rooms/${roomCode}/players`), snapshot => {
    const players = snapshot.val();
    const playerCount = Object.keys(players || {}).length;

    if (playerCount > 6) {
      alert("このルームは満員です！");
    } else {
      displayPlayers(players);
    }
  });
  // ✅ 作成完了後のフラグ設定とボタン制御
roomCreated = true;
joinBtn.disabled = true;
createBtn.disabled = true;

}



// ✅ 「ルームに入る」ボタン → 入力欄表示
joinBtn.addEventListener("click", () => {
  joinUI.style.display = "block";
  joinBtn.disabled = true;
  createBtn.disabled = true;
});

// ✅ 「キャンセル」ボタン → 入力欄非表示＆ボタン復帰
cancelJoin.addEventListener("click", () => {
  joinUI.style.display = "none";
  joinInput.value = "";
  if (!roomCreated && !roomJoined) {
    joinBtn.disabled = false;
    createBtn.disabled = false;
  }
});

// ✅ 「参加」ボタン処理
submitJoin.addEventListener("click", async () => {
  if (roomCreated || roomJoined) return;

  const code = joinInput.value.trim();
  if (!code) {
    alert("ルーム番号を入力してください");
    return;
  }

  const roomRef = ref(db, `rooms/${code}`);
  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    alert("そのルームは存在しません");
    return;
  }

  const playersRef = ref(db, `rooms/${code}/players`);
  const playersSnap = await get(playersRef);
  const players = playersSnap.val() || {};
  const playerCount = Object.keys(players).length;

  if (playerCount >= 6) {
    alert("このルームは満員です！");
    return;
  }

  // 名前付きで参加
  await set(ref(db, `rooms/${code}/players/${myUID}`), {
    uid: myUID,
    name: localStorage.getItem("playerName") || "名無し"
  });

  roomInfo.innerHTML = `ルーム番号：<strong>${code}</strong><br>参加者一覧：`;
  onValue(ref(db, `rooms/${code}/players`), snapshot => {
    displayPlayers(snapshot.val());
  });

  roomJoined = true;
  joinBtn.disabled = true;
  createBtn.disabled = true;
  joinUI.style.display = "none";
});

// ✅ Firebase 認証後に操作を許可
onAuthStateChanged(auth, async user => {
  if (user) {
    myUID = user.uid;
    createBtn.disabled = false;
    joinBtn.disabled = false;
  } else {
    await signInAnonymously(auth);
  }
});
// グローバル状態フラグ
window.appState = {
  isJoining: false,
  isCreating: false,
  isEnteringCode: false
};

document.getElementById("createRoomBtn").addEventListener("click", async () => {
  // ✅ 状態確認と即ロック（非同期を待たない！）
  if (window.appState.isJoining || window.appState.isCreating || window.appState.isEnteringCode) return;
  window.appState.isCreating = true;

  // ✅ UI即無効化
  document.getElementById("createRoomBtn").disabled = true;
  document.getElementById("joinRoomBtn").disabled = true;

  try {
    await createRoomAndJoin(myUID);
  } catch (e) {
    console.error("ルーム作成失敗:", e);
    window.appState.isCreating = false; // 作成失敗時は解除
    document.getElementById("createRoomBtn").disabled = false;
    document.getElementById("joinRoomBtn").disabled = false;
  }
});


// キャンセルしたとき
document.getElementById("cancelJoin").addEventListener("click", () => {
  window.appState.isEnteringCode = false;

  document.getElementById("joinRoomUI").style.display = "none";

  // ルーム作成・参加していないなら再有効化
  if (!window.appState.isCreating && !window.appState.isJoining) {
    document.getElementById("createRoomBtn").disabled = false;
    document.getElementById("joinRoomBtn").disabled = false;
  }
});

