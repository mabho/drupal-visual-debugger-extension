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

chrome.action.onClicked.addListener(async (tab) => {
  console.warn(`Loading this tab element...`, tab);

  if (!tab.id) return;

  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['lib/visual-debugger.min.css'],
  });

  await injectFontsCss(tab.id);

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['lib/visual-debugger.global.min.js', 'content/init.js'],
  });
});
