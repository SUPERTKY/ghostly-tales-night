document.getElementById("submitJoin").addEventListener("click", async () => {
  // ✅ すでに作成・参加中なら無視、または入力中でないなら無視
  if (window.appState.isCreating || window.appState.isJoining || !window.appState.isEnteringCode) return;

  window.appState.isJoining = true;

  // 🔒 UIロック（画像ボタンにも対応）
  const createBtn = document.getElementById("createRoomBtn");
  const joinBtn = document.getElementById("joinRoomBtn");
  createBtn.disabled = true;
  joinBtn.disabled = true;
  createBtn.style.pointerEvents = "none";
  joinBtn.style.pointerEvents = "none";
  createBtn.style.opacity = "0.5";
  joinBtn.style.opacity = "0.5";

  const code = document.getElementById("joinRoomCode").value.trim();
  if (!code) {
    alert("コードが未入力です");
    window.appState.isJoining = false;
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

    // ✅ UI更新・状態更新
    window.appState.isEnteringCode = false;
    window.appState.hasJoined = true;
    document.getElementById("joinRoomUI").style.display = "none";

    const roomInfo = document.getElementById("roomInfo");
    roomInfo.innerHTML = `ルーム番号：<strong>${code}</strong><br>参加者一覧：`;
    onValue(ref(db, `rooms/${code}/players`), snap => displayPlayers(snap.val()));

    // 🔒 完全に両方のボタンを封印（もう参加も作成もできない）
    createBtn.disabled = true;
    joinBtn.disabled = true;
    createBtn.style.pointerEvents = "none";
    joinBtn.style.pointerEvents = "none";
    createBtn.style.opacity = "0.5";
    joinBtn.style.opacity = "0.5";

  } catch (e) {
    console.error("参加失敗:", e);
    alert(e.message || "参加に失敗しました");

    // 状態を戻す
    window.appState.isJoining = false;
    window.appState.isEnteringCode = false;

    // 再び操作可能にする
    createBtn.disabled = false;
    joinBtn.disabled = false;
    createBtn.style.pointerEvents = "auto";
    joinBtn.style.pointerEvents = "auto";
    createBtn.style.opacity = "1";
    joinBtn.style.opacity = "1";
  }
});
