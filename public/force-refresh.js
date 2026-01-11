(function () {
  try {
    const v = localStorage.getItem("app_version");
    const current = "v_" + Date.now().toString().slice(0, 8);

    if (v !== current) {
      localStorage.setItem("app_version", current);
      location.reload(true);
    }
  } catch (e) {}
})();
