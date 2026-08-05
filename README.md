# Drupal Visual Debugger — Chrome Extension

Thin Chrome (Manifest V3) wrapper around
[`drupal-visual-debugger`](https://github.com/mabho/drupal-visual-debugger),
the framework-agnostic engine that renders on-screen overlays and a fly-out
inspector panel from Drupal's Twig theme-debug output. Grab the latest
built release of that library from
[its Releases page](https://github.com/mabho/drupal-visual-debugger/releases).

This extension does not reimplement any debugging logic — it just links to
the library's built assets (see "The `drupal-visual-debugger` dependency"
below) and injects them into a tab when you click the toolbar icon.

## Requirements

The site you're inspecting must have Twig debugging enabled
(`services.yml` -> `twig.config.debug: true`, or the equivalent
`development.services.yml` override). Without it, Drupal doesn't emit the
`THEME DEBUG` HTML comments this library parses, and there's nothing to
overlay.

## How it works

- `background.js` — a service worker. Clicking the toolbar icon toggles the
  debugger on/off for that tab: turning it on requests host permission for
  that tab's specific origin (`chrome.permissions.request`, prompting once
  per origin), then injects
  `node_modules/drupal-visual-debugger/dist/visual-debugger.min.css` and
  `.../visual-debugger.global.min.js` via `chrome.scripting`, followed by
  `content/init.js`. The on state is tracked per tab (`chrome.storage.session`,
  keyed by tab ID + origin) and survives same-origin navigation — `chrome.tabs.onUpdated`
  re-injects on every new document as long as the tab stays on that origin.
  Navigating to a different origin, or closing the tab, clears the tracked
  state (no auto-reinjection there — you'd click the icon again). Turning it
  off calls the library's `destroy()` (see below) to remove everything from
  the live page without a reload.
- `content/init.js` — calls `DrupalVisualDebugger.init()`, passing a small
  storage adapter that bridges the library's synchronous `get`/`set`
  interface to `chrome.storage.local` (values are pre-fetched before
  `init()` runs, then written through on every `set`). The returned instance
  is stashed on `window.__drupalVisualDebuggerInstance` so `background.js`
  can call `.destroy()` on it later.
- `node_modules/drupal-visual-debugger/` — the library's built output,
  installed via npm (see below). Nothing in this repo modifies or
  duplicates those files.

Permissions: `activeTab` + `scripting` (inject into the tab you click),
`storage` (persist the panel's own activation state/width, separately from
the on/off tracking above), and `optional_host_permissions` for `http(s)`
origins — granted per-origin, at the moment you turn the debugger on for
that tab, rather than declared upfront for every site. `web_accessible_resources`
exposes the library's font files so the icon font the inspector panel uses
can load when referenced from the injected CSS.

## The `drupal-visual-debugger` dependency

This repo pulls in the library as a plain npm dependency pointed at a
pre-built release tarball — **not** an npm-registry package, and
deliberately not a git dependency either (a git dependency would run the
library's own build on every `npm install`; a tarball URL is treated as
already-built, so nothing compiles here):

```json
"dependencies": {
  "drupal-visual-debugger": "https://github.com/mabho/drupal-visual-debugger/releases/download/1.2.4/drupal-visual-debugger-1.2.4.tgz"
}
```

Run `npm install` to fetch it — this populates
`node_modules/drupal-visual-debugger/dist/` with the compiled JS/CSS and
icon font that `manifest.json`/`background.js` reference directly.
`package-lock.json` records a `sha512` integrity hash for that exact
tarball, computed automatically by npm from the downloaded bytes (nothing
to compute by hand) — a future `npm ci` will fail loudly if that release
asset's contents ever changed unexpectedly.

### Updating to a newer library release

1. Find the release you want on the
   [Releases page](https://github.com/mabho/drupal-visual-debugger/releases)
   and copy its `.tgz` asset URL.
2. Run:
   ```
   npm install https://github.com/mabho/drupal-visual-debugger/releases/download/<version>/drupal-visual-debugger-<version>.tgz
   ```
   npm rewrites both the `dependencies` entry in `package.json` and the
   `integrity` hash in `package-lock.json` for you — there is no separate
   version-pinning or hashing step. Commit both files.
3. Reload the unpacked extension in `chrome://extensions` to pick up the new
   files.

There's no `latest`/semver-range shorthand here (this isn't a registry
package), so bumping the version is always this explicit, one-release-at-a-time
step.

## Loading unpacked (development)

1. Run `npm install` (see above — populates `node_modules/drupal-visual-debugger/`).
2. Visit `chrome://extensions`.
3. Enable "Developer mode".
4. Click "Load unpacked" and select this folder.
5. Navigate to a Drupal page with Twig debugging enabled and click the
   extension's toolbar icon (grant the permission prompt for that site).

## License

GPL-2.0-or-later, matching the vendored `drupal-visual-debugger` library
(see `LICENSE`).
