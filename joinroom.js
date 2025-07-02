// 参加ボタン押したときの処理
document.getElementById("submitJoin").addEventListener("click", async () => {
  const code = document.getElementById("joinRoomCode").value.trim();
  if (!code) {
    alert("ルーム番号を入力してください");
    return;
  }

  // Firebaseルーム確認
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

  // 自分の名前を追加
  await set(ref(db, `rooms/${code}/players/${myUID}`), {
    uid: myUID,
    name: localStorage.getItem("playerName") || "名無し"
  });

  // 参加者一覧表示など処理
  roomInfo.innerHTML = `ルーム番号：<strong>${code}</strong><br>参加者一覧：`;
  onValue(ref(db, `rooms/${code}/players`), snapshot => {
    displayPlayers(snapshot.val());
  });

  // UIをロック
  document.getElementById("joinRoomBtn").disabled = true;
  document.getElementById("createRoomBtn").disabled = true;
  document.getElementById("joinRoomUI").style.display = "none";
});
