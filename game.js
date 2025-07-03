import {
  getDatabase, ref, onDisconnect, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getAuth, signInAnonymously, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase初期化後の処理
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const uid = user.uid;
  const hostRef = ref(db, `rooms/${roomCode}`);

  // ✅ 再度 onDisconnect を設定
  await onDisconnect(hostRef).remove();
});

// ルーム削除を監視（ホストが落ちたなど）
const roomRef = ref(db, `rooms/${roomCode}`);
onValue(roomRef, (snapshot) => {
  if (!snapshot.exists()) {
    alert("ホストがルームを解散したため、ゲームを終了します");
    window.location.href = "index.html";
  }
});
// ✅ クエリパラメータから roomCode を取得
const params = new URLSearchParams(location.search);
const roomCode = params.get("roomCode");

// ❗️クエリがなければ強制送還
if (!roomCode) {
  alert("ルーム情報が見つかりませんでした");
  window.location.href = "index.html";
  throw new Error("ルームコードなし");
}

// ✅ Firebase 初期化
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

// ✅ タブ切替で強制送還
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    window.location.href = "index.html";
  }
});

// ✅ プレイヤー表示領域
const playerList = document.getElementById("playerList");

// ✅ フェードアウトとプレイヤー表示処理
window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("fadeOverlay");
  
  // 🔽 フェードアウト
  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 100);

  overlay.addEventListener("transitionend", () => {
    overlay.style.pointerEvents = "none";
  });

  // 🔽 プレイヤー取得＆表示
  fetchAndShowPlayers();
});

// ✅ プレイヤーを取得してランダム表示
async function fetchAndShowPlayers() {
  const playersRef = ref(db, `rooms/${roomCode}/players`);
  const snapshot = await get(playersRef);

  if (!snapshot.exists()) {
    alert("プレイヤー情報が見つかりませんでした");
    return;
  }

  const players = snapshot.val();
  const shuffled = Object.values(players).sort(() => Math.random() - 0.5);

  shuffled.forEach((player, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${player.name || "名無し"}`;
    playerList.appendChild(li);
  });
}
