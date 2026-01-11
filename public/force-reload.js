// public/force-reload.js
(async function () {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }
  }

  if (window.caches) {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }
  }

  console.log("🔥 Cache y Service Workers eliminados");
})();
