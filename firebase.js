
const firebaseConfig = {
  apiKey: "AIzaSyB1hyrktLnx7lzW2jf4ZeIzTrBEY-IEgPo",
  authDomain: "horror-game-9b2d2.firebaseapp.com",
  projectId: "horror-game-9b2d2",
  storageBucket: "horror-game-9b2d2.firebasestorage.app",
  messagingSenderId: "534762448588",
  appId: "1:534762448588:web:e0a6a01cd14c7f1dce4469"
  databaseURL: "https://horror-game-9b2d2-default-rtdb.asia-southeast1.firebasedatabase.app", // ✅新しい正しいURL
};

// 初期化
firebase.initializeApp(firebaseConfig);
var db = firebase.database();
