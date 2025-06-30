window.addEventListener("DOMContentLoaded", () => {
  const fadeOverlay = document.getElementById("fadeOverlay");

  // 最初のフェードイン（黒→透明）
  setTimeout(() => {
    fadeOverlay.style.opacity = "0";
  }, 100);

  fadeOverlay.addEventListener("transitionend", () => {
    fadeOverlay.style.pointerEvents = "none";
  });

  // 共通：フェードアウトしてから遷移
  function fadeAndGo(url) {
    fadeOverlay.style.pointerEvents = "auto";
    fadeOverlay.style.opacity = "1";
    fadeOverlay.addEventListener("transitionend", () => {
      window.location.href = url;
    }, { once: true });
  }

  // 各ボタンに遷移をセット
  document.getElementById("btn1").addEventListener("click", () => {
    fadeAndGo("anaumekaidan.html");
  });

  document.getElementById("btn2").addEventListener("click", () => {
    alert("ボタン2が押されました");
  });

  document.getElementById("btn3").addEventListener("click", () => {
    alert("ボタン3が押されました");
  });
});
