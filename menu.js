window.addEventListener("DOMContentLoaded", () => {
  const fadeOverlay = document.getElementById("fadeOverlay");

  // フェードイン
  setTimeout(() => {
    fadeOverlay.style.opacity = "0";
  }, 100);

  // 各ボタンのクリック処理（例）
  document.getElementById("btn1").addEventListener("click", () => {
    alert("ボタン1が押されました");
  });

  document.getElementById("btn2").addEventListener("click", () => {
    alert("ボタン2が押されました");
  });

  document.getElementById("btn3").addEventListener("click", () => {
    alert("ボタン3が押されました");
  });
});
