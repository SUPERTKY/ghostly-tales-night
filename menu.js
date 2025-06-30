window.addEventListener("DOMContentLoaded", () => {
  const fadeOverlay = document.getElementById("fadeOverlay");
  const clickSound = document.getElementById("clickSound");

  // 初回フェードイン
  setTimeout(() => {
    fadeOverlay.style.opacity = "0";
  }, 100);

  fadeOverlay.addEventListener("transitionend", () => {
    fadeOverlay.style.pointerEvents = "none";
  });

  function fadeAndGo(url) {
    clickSound.currentTime = 0; // 巻き戻し（連打対策）
    clickSound.play();          // 効果音再生

    fadeOverlay.style.pointerEvents = "auto";
    fadeOverlay.style.opacity = "1";

    fadeOverlay.addEventListener("transitionend", () => {
      window.location.href = url;
    }, { once: true });
  }

  // ボタンごとに処理を割り当て
  document.getElementById("btn1").addEventListener("click", () => {
    fadeAndGo("anaumekaidan.html");
  });

  document.getElementById("btn2").addEventListener("click", () => {
    clickSound.currentTime = 0;
    clickSound.play();
    alert("ボタン2が押されました");
  });

  document.getElementById("btn3").addEventListener("click", () => {
    clickSound.currentTime = 0;
    clickSound.play();
    alert("ボタン3が押されました");
  });
});
