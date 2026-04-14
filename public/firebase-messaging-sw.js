importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCJn2zMfWYz_gFN5goDUrkUjVAIqPGCW-Y",
  authDomain: "mtxr-d8b90.firebaseapp.com",
  projectId: "mtxr-d8b90",
  storageBucket: "mtxr-d8b90.firebasestorage.app",
  messagingSenderId: "688078973753",
  appId: "1:688078973753:web:c7279cdd8ba04c8e0b56e8"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
