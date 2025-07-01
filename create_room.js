import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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

// ルームコード生成関数
function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ボタンイベント
document.getElementById("createRoomBtn").addEventListener("click", async () => {
  const roomCode = generateRoomCode();
  const roomRef = ref(db, `rooms/${roomCode}`);

  const roomData = {
    createdAt: Date.now(),
    status: "waiting",
    host: "host"
  };

  try {
    await set(roomRef, roomData);
    window.location.href = `room.html?room=${roomCode}`;
  } catch (e) {
    alert("ルーム作成に失敗しました。");
    console.error(e);
  }
});

document.getElementById("joinRoomBtn").addEventListener("click", () => {
  // 今は仮でindex.htmlに飛ばす
  window.location.href = "join_room.html";
});
