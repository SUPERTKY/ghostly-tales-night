window.addEventListener("DOMContentLoaded", () => {
  const fadeOverlay = document.getElementById("fadeOverlay");
  const clickSound = document.getElementById("clickSound");

  // 最初のフェードイン
  setTimeout(() => {
    fadeOverlay.style.opacity = "0";
  }, 100);

  fadeOverlay.addEventListener("transitionend", () => {
    fadeOverlay.style.pointerEvents = "none";
  });

  function fadeWithSoundThenGo(url) {
    // フェードアウト開始（黒くする）
    fadeOverlay.style.pointerEvents = "auto";
    fadeOverlay.style.opacity = "1";

    // 効果音を再生（即時）
    clickSound.currentTime = 0;
    clickSound.play();

    // 効果音が終わったらページ遷移
    clickSound.addEventListener("ended", () => {
      window.location.href = url;
    }, { once: true });
  }

  // ボタン1だけページ移動
  document.getElementById("btn1").addEventListener("click", () => {
    fadeWithSoundThenGo("anaumekaidan.html");
  });

  // 他のボタンは音だけ＆アラート
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
    // ボタン4：例文ページへ遷移
  document.getElementById("btn4").addEventListener("click", () => {
    fadeWithSoundThenGo("example.html"); // ← 遷移先HTMLファイル名を自由に
  });

});
