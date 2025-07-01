import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, get, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB1hyrktLnx7lzW2jf4ZeIzTrBEY-IEgPo",
  authDomain: "horror-game-9b2d2.firebaseapp.com",
  databaseURL: "https://horror-game-9b2d2-default-rtdb.asia-southeast1.firebasedatabase.app", // ✅新しい正しいURL
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

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function displayPlayers(players) {
  playerList.innerHTML = "";
  Object.values(players || {}).forEach((player, index) => {
    const li = document.createElement("li");
    li.textContent = `・プレイヤー${index + 1}（UID: ${player.uid.slice(0, 6)}...）`;
    playerList.appendChild(li);
  });
}

async function createRoomAndJoin(uid) {
  const roomCode = generateRoomCode();
  currentRoomCode = roomCode;
  const roomRef = ref(db, `rooms/${roomCode}`);
  const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);

  const roomData = {
    createdAt: Date.now(),
    status: "waiting"
  };

  await set(roomRef, roomData);
  await set(playerRef, { uid });

  roomInfo.innerHTML = `ルーム番号：<strong>${roomCode}</strong><br>参加者一覧：`;
  onValue(ref(db, `rooms/${roomCode}/players`), snapshot => {
    const players = snapshot.val();
    if (players && Object.keys(players).length > 6) {
      alert("このルームは満員です！");
      // 今後の処理を制御するならここで分岐可
    } else {
      displayPlayers(players);
    }
  });
}

// 認証してから処理開始
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
