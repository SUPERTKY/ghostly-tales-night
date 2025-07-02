// グローバル状態の初期化（最上部でやる）
if (!window.appState) {
  window.appState = {
    isCreating: false,
    isJoining: false,
    isEnteringCode: false,
    hasJoined: false
  };
}

const createBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinRoomBtn");
const playerRef = ref(db, `rooms/${code}/players/${uid}`);
await onDisconnect(playerRef).remove();  // 自分だけ削除
// ルームが削除されたら index.html に戻す（参加者・主催者共通）
onValue(ref(db, `rooms/${currentRoomCode}`), snapshot => {
  if (!snapshot.exists()) {
    alert("ホストがルームを解散しました");
    window.location.href = "index.html"; // もしくはトップに戻す
  }
});

function disableBothButtons() {
  createBtn.classList.add("disabled");
  joinBtn.classList.add("disabled");
}

function enableBothButtons() {
  createBtn.classList.remove("disabled");
  joinBtn.classList.remove("disabled");
}


// ✅ 「ルームに入る」ボタン → 入力欄表示 + ボタン無効化
joinBtn.addEventListener("click", () => {
  document.getElementById("joinRoomUI").style.display = "block";
  window.appState.isEnteringCode = true;
  disableBothButtons();
});

// ✅ 「キャンセル」ボタン → 入力欄非表示 + 状態とボタン復帰
cancelJoin.addEventListener("click", () => {
  document.getElementById("joinRoomUI").style.display = "none";
  document.getElementById("joinRoomCode").value = "";
  window.appState.isEnteringCode = false;

  if (!window.appState.isCreating && !window.appState.isJoining && !window.appState.hasJoined) {
    enableBothButtons();
  }
});

// ✅ 「参加」ボタン → 実際の参加処理
submitJoin.addEventListener("click", async () => {
  if (window.appState.isCreating || window.appState.isJoining || !window.appState.isEnteringCode) return;

  window.appState.isJoining = true;
  disableBothButtons();

  const code = document.getElementById("joinRoomCode").value.trim();
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

    // 状態更新
    window.appState.isJoining = false;
    window.appState.isEnteringCode = false;
    window.appState.hasJoined = true;

    document.getElementById("joinRoomUI").style.display = "none";
    document.getElementById("joinRoomCode").value = "";

    const roomInfo = document.getElementById("roomInfo");
    roomInfo.innerHTML = `ルーム番号：<strong>${code}</strong><br>参加者一覧：`;
    onValue(ref(db, `rooms/${code}/players`), snap => displayPlayers(snap.val()));

    // 🔒 完全封印（参加済み）
    disableBothButtons();

  } catch (e) {
    console.error("参加失敗:", e);
    alert(e.message || "参加に失敗しました");

    window.appState.isJoining = false;
    window.appState.isEnteringCode = false;
    enableBothButtons();
  }
});
