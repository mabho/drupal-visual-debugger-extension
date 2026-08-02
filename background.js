// insertCSS({ files }) resolves relative url()s in the stylesheet against the
// page being styled, not the extension package, so the @font-face src paths
// in visual-debugger.fonts.css 404 against the debugged site. Fetch the file
// ourselves and rewrite those paths to absolute chrome-extension:// URLs
// before injecting it as a css string.
async function injectFontsCss(tabId) {
  const cssUrl = chrome.runtime.getURL('lib/visual-debugger.fonts.css');
  const raw = await (await fetch(cssUrl)).text();

  const fixed = raw.replace(
    /url\((['"]?)fonts\//g,
    `url($1${chrome.runtime.getURL('lib/fonts/')}`
  );

  await chrome.scripting.insertCSS({ target: { tabId }, css: fixed });
}

// Injects the library's CSS/fonts/JS and runs its init() against the tab's
// current document. Safe to call more than once against the same document —
// content/init.js's own window flag and the library's own
// CLASS_NAMES.initialized guard on `root` both make a repeat call a no-op —
// which is what lets this same function back both the toolbar click and
// re-activation on every later same-origin navigation (see onUpdated below).
async function activateTab(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ['lib/visual-debugger.min.css'],
  });

  await injectFontsCss(tabId);

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['lib/visual-debugger.global.min.js', 'content/init.js'],
  });
}

// Tears the debugger back down without a page reload, via the destroy() the
// library exposes off its init() return value (content/init.js stashes it on
// window.__drupalVisualDebuggerInstance). Wrapped in a try/catch since the
// tab may already be gone, or have navigated to a page we no longer have
// access to, between the toggle-off click and this call.
async function deactivateTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.__drupalVisualDebuggerInstance?.destroy();
        window.__drupalVisualDebuggerInstance = null;
        window.__drupalVisualDebuggerInitialized = false;
      },
    });
  } catch {
    // Nothing to tear down on this tab anymore — not an error.
  }
}

// ---- Per-tab "activated" tracking ------------------------------------------
//
// chrome.storage.session (not .local) is deliberate: the debugger's on/off
// state should carry across same-origin navigation within a browsing
// session, but always start fresh (off) after a full browser restart.

const ACTIVE_TABS_KEY = 'vdActiveTabs';

async function getActiveTabs() {
  const stored = await chrome.storage.session.get(ACTIVE_TABS_KEY);
  return stored[ACTIVE_TABS_KEY] || {};
}

async function setActiveTabs(activeTabs) {
  await chrome.storage.session.set({ [ACTIVE_TABS_KEY]: activeTabs });
}

function updateBadge(tabId, active) {
  chrome.action.setBadgeText({ tabId, text: active ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#2e7d32' });
}

// Only http(s) origins are debuggable (and permission-requestable) — returns
// null for chrome://, about:, file://, or a tab with no URL at all.
function originOf(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const origin = originOf(tab.url);
  if (!origin) return;

  // Request host permission for this specific origin only — a real prompt
  // tied to this click, rather than a blanket <all_urls> grant at install
  // time (declared as optional_host_permissions in manifest.json). This
  // must be the first `await` in the handler: Chrome ties the click's user
  // gesture to this call, and any awaited work before it (even a fast
  // storage read) can cause it to reject with a "must be called during a
  // user gesture" error. If the origin is already granted — the
  // toggle-off case below — this just resolves `true` immediately with no
  // prompt shown, so it's harmless to always call up front.
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) return;

  const activeTabs = await getActiveTabs();
  const current = activeTabs[tab.id];

  if (current && current.origin === origin) {
    await deactivateTab(tab.id);
    delete activeTabs[tab.id];
    await setActiveTabs(activeTabs);
    updateBadge(tab.id, false);
    return;
  }

  await activateTab(tab.id);
  activeTabs[tab.id] = { origin };
  await setActiveTabs(activeTabs);
  updateBadge(tab.id, true);
});

// Re-activates on same-origin navigation (a new document needs a fresh
// init()), and auto-deactivates — clearing the tracked entry, with no
// re-injection attempted — the moment the tab leaves the origin it was
// granted permission for. tab.url is only populated on this event for
// origins we hold host permission for, so a missing url is itself the
// signal that the tab navigated away from the granted origin.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  const activeTabs = await getActiveTabs();
  const entry = activeTabs[tabId];
  if (!entry) return;

  const origin = originOf(tab.url);
  if (origin === entry.origin) {
    await activateTab(tabId);
    return;
  }

  delete activeTabs[tabId];
  await setActiveTabs(activeTabs);
  updateBadge(tabId, false);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const activeTabs = await getActiveTabs();
  if (!(tabId in activeTabs)) return;
  delete activeTabs[tabId];
  await setActiveTabs(activeTabs);
});
