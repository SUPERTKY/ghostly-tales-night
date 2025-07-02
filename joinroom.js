document.getElementById("submitJoin").addEventListener("click", async () => {
  // ✅ ここでも即ブロック
  if (window.appState.isCreating || window.appState.isJoining || !window.appState.isEnteringCode) return;
  window.appState.isJoining = true;

  // UI即ロック
  document.getElementById("createRoomBtn").disabled = true;
  document.getElementById("joinRoomBtn").disabled = true;

  const code = document.getElementById("joinRoomCode").value.trim();
  if (!code) return alert("コードが未入力");

  try {
    const roomRef = ref(db, `rooms/${code}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) throw new Error("そのルームは存在しません");

    const playersSnap = await get(ref(db, `rooms/${code}/players`));
    const players = playersSnap.val() || {};
    if (Object.keys(players).length >= 6) throw new Error("満員です");

    await set(ref(db, `rooms/${code}/players/${myUID}`), {
      uid: myUID,
      name: localStorage.getItem("playerName") || "名無し"
    });

    window.appState.isEnteringCode = false;

    // UI更新
    document.getElementById("joinRoomUI").style.display = "none";
    roomInfo.innerHTML = `ルーム番号：<strong>${code}</strong><br>参加者一覧：`;
    onValue(ref(db, `rooms/${code}/players`), snap => displayPlayers(snap.val()));
  } catch (e) {
    console.error("参加失敗:", e);
    alert(e.message || "参加に失敗しました");
    window.appState.isJoining = false;
    window.appState.isEnteringCode = false;
    document.getElementById("joinRoomBtn").disabled = false;
    document.getElementById("createRoomBtn").disabled = false;
  }
});
