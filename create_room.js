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

const createBtn = document.getElementById("createRoomBtn");
const roomInfo = document.getElementById("roomInfo");
const playerList = document.getElementById("playerList");

let currentRoomCode = null;
let myUID = null;

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

async function createRoomAndJoin(uid) {
  const playerName = localStorage.getItem("playerName") || "名無し";

  // ✅ 既にルーム作っているか確認（rooms内を走査）
  const roomsSnapshot = await get(ref(db, "rooms"));
  const rooms = roomsSnapshot.val();

  const alreadyCreatedRoom = Object.entries(rooms || {}).find(([code, room]) => {
    return room.host === uid;
  });

  if (alreadyCreatedRoom) {
    alert("すでにルームを作成しています！");
    return;
  }

  // ✅ 重複しないルーム番号を探す
  let roomCode;
  while (true) {
    const codeCandidate = generateRoomCode();
    const roomRef = ref(db, `rooms/${codeCandidate}`);
    const exists = await get(roomRef);
    if (!exists.exists()) {
      roomCode = codeCandidate;
      break;
    }
  }

  currentRoomCode = roomCode;
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);

  // ✅ ルーム情報にホストUIDを記録
  const roomData = {
    createdAt: Date.now(),
    status: "waiting",
    host: uid
  };

  await set(roomRef, roomData);
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
}


// 🔐 認証完了後にボタンを有効化
onAuthStateChanged(auth, async user => {
  if (user) {
    myUID = user.uid;
    createBtn.addEventListener("click", () => {
      createRoomAndJoin(myUID);
    });
  } else {
    await signInAnonymously(auth);
  }
});
