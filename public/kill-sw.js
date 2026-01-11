(async function () {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }
    console.log("All service workers unregistered");
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }
    console.log("All caches cleared");
  }

  location.reload(true);
})();
