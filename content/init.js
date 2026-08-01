(function () {
  if (window.__drupalVisualDebuggerInitialized) return;
  window.__drupalVisualDebuggerInitialized = true;

  const STORAGE_KEYS = ['debuggerActivated', 'controllerWidth'];

  chrome.storage.local.get(STORAGE_KEYS, (stored) => {
    const cache = { ...stored };

    // drupal-visual-debugger reads storage synchronously during init, so we
    // pre-fetch the values above and write through to chrome.storage.local
    // on every set() instead of adapting it to an async API.
    const chromeStorageAdapter = {
      get(key, fallback = null) {
        return cache[key] !== undefined ? cache[key] : fallback;
      },
      set(key, value) {
        cache[key] = value;
        chrome.storage.local.set({ [key]: value });
      },
    };

    window.DrupalVisualDebugger.init({ storage: chromeStorageAdapter });
  });
})();
