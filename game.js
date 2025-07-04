import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  onValue,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ クエリパラメータから roomCode を取得
const params = new URLSearchParams(location.search);
const roomCode = params.get("roomCode");

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
const auth = getAuth(app);

// ✅ 認証して onDisconnect を再設定
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    await signInAnonymously(auth);
    return;
  }

  const uid = user.uid;
  const hostRef = ref(db, `rooms/${roomCode}`);
  await onDisconnect(hostRef).remove();
});

// ✅ タブ離脱時に戻す処理（戻さないなら削除）
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    window.location.href = "index.html";
  }
});

// ✅ ホストがルームを削除したら強制送還
const roomRef = ref(db, `rooms/${roomCode}`);
onValue(roomRef, (snapshot) => {
  if (!snapshot.exists()) {
    alert("ホストがルームを解散したため、ゲームを終了します");
    window.location.href = "index.html";
  }
});

// ✅ フェードアウト処理
window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("fadeOverlay");

  // フェードアウト開始
  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 100);

  overlay.addEventListener("transitionend", () => {
    overlay.style.pointerEvents = "none";
  });

  fetchAndShowPlayers();
});

async function fetchAndShowPlayers() {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = ""; // 🔴 これを追加して、前の内容を消す

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

// ✅ フェードアウト完了後にプレイヤー名表示 → 3秒後に再フェードイン＆テキスト表示
window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("fadeOverlay");

  // フェードアウト開始
  setTimeout(() => {
    overlay.style.opacity = "0";
  }, 100);

  overlay.addEventListener("transitionend", async () => {
    overlay.style.pointerEvents = "none";

    // プレイヤー表示
    await fetchAndShowPlayers();

    // 少し待ってから再度フェードイン
    setTimeout(() => {
      overlay.style.opacity = "1";
      overlay.style.pointerEvents = "auto";
    }, 3000); // ← 名簿表示のため3秒待つ
  });

  // 再フェードイン完了後にテキストボックス表示
  overlay.addEventListener("transitionend", () => {
    if (overlay.style.opacity === "1") {
      // フェードインが終わったとき
      const textboxContainer = document.getElementById("textboxContainer");
      textboxContainer.style.display = "block";

      // フェードアウトしてもう邪魔にならないように
      setTimeout(() => {
        overlay.style.opacity = "0";
        overlay.style.pointerEvents = "none";
      }, 100); // 軽くフェードアウト
    }
  });
});

