window.addEventListener("DOMContentLoaded", () => {
  const fadeOverlay = document.getElementById("fadeOverlay");

  // フェードイン
  setTimeout(() => {
    fadeOverlay.style.opacity = "0";
  }, 100);
  fadeOverlay.addEventListener("transitionend", () => {
  fadeOverlay.style.pointerEvents = "none";
});

  // 各ボタンのクリック処理（例）
  document.getElementById("btn1").addEventListener("click", () => {
    window.location.href = "anaumekaidan.html";

  });

  document.getElementById("btn2").addEventListener("click", () => {
    alert("ボタン2が押されました");
  });

  document.getElementById("btn3").addEventListener("click", () => {
    alert("ボタン3が押されました");
  });
});
