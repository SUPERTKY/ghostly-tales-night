
import {
  initializeApp, getApps, getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// ✅ クエリパラメータから roomCode を取得
const params = new URLSearchParams(location.search);
const roomCode = params.get("roomCode");

// 不正アクセス（クエリなし）なら追い出す
if (!roomCode) {
  window.location.href = "index.html";
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
// Firebase設定のあと（またはページ読み込み後）にこれを追加
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    window.location.href = "index.html";
  }
});
// ✅ クエリからルームコードを取得
const params = new URLSearchParams(window.location.search);
const roomCode = params.get("roomCode");
// フェードアウト（黒画面を消す）
window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("fadeOverlay");
  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 100); // 少し遅らせて透明化

  // 完全に透明になったらクリックできるように
  overlay.addEventListener("transitionend", () => {
    overlay.style.pointerEvents = "none";
  });
});

if (!roomCode) {
  alert("ルーム情報が見つかりませんでした");
  throw new Error("ルームコードなし");
}

// プレイヤー表示領域
const playerList = document.getElementById("playerList");

// プレイヤーを取得＆表示
async function fetchAndShowPlayers() {
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const snapshot = await get(playersRef);

  if (!snapshot.exists()) {
    alert("プレイヤー情報が見つかりませんでした");
    return;
  }

  const players = snapshot.val();
  const shuffled = Object.values(players).sort(() => Math.random() - 0.5);

  // 表示
  shuffled.forEach((player, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${player.name || "名無し"}`;
    playerList.appendChild(li);
  });
}

// DOMが読み込まれたら実行
window.addEventListener("DOMContentLoaded", () => {
  fetchAndShowPlayers();
});
