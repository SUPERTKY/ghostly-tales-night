// あなたのFirebase設定情報に置き換えてください（プロジェクト設定から取得）
const firebaseConfig = {
  apiKey: "XXXXX",
  authDomain: "XXXXX.firebaseapp.com",
  databaseURL: "https://XXXXX.firebaseio.com",
  projectId: "XXXXX",
  storageBucket: "XXXXX.appspot.com",
  messagingSenderId: "XXXXX",
  appId: "XXXXX"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
