window.addEventListener("DOMContentLoaded", () => {
  const fadeOverlay = document.getElementById("fadeOverlay");

  // 0.1秒後に黒フェードイン（ちらつき防止）
  setTimeout(() => {
    fadeOverlay.style.opacity = "0";
  }, 100);
});
