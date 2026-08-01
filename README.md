# Drupal Visual Debugger — Chrome Extension

Thin Chrome (Manifest V3) wrapper around
[`drupal-visual-debugger`](https://github.com/mabho/drupal-visual-debugger),
the framework-agnostic engine that renders on-screen overlays and a fly-out
inspector panel from Drupal's Twig theme-debug output.

This extension does not reimplement any debugging logic — it just links to
the library's built assets (`lib/`, see below) and injects them into the
active tab when you click the toolbar icon.

## Requirements

The site you're inspecting must have Twig debugging enabled
(`services.yml` -> `twig.config.debug: true`, or the equivalent
`development.services.yml` override). Without it, Drupal doesn't emit the
`THEME DEBUG` HTML comments this library parses, and there's nothing to
overlay.

## How it works

- `background.js` — a service worker that listens for toolbar-icon clicks
  and, via `chrome.scripting`, injects `lib/visual-debugger.min.css` and
  `lib/visual-debugger.global.min.js` into the active tab, followed by
  `content/init.js`.
- `content/init.js` — calls `DrupalVisualDebugger.init()`, passing a small
  storage adapter that bridges the library's synchronous
  `get`/`set` interface to `chrome.storage.local` (values are pre-fetched
  before `init()` runs, then written through on every `set`).
- `lib/` — **not checked into git.** For local development this is a single
  symlink straight to a sibling `drupal-visual-debugger` checkout's `dist/`
  folder, created by `scripts/link-lib.sh` (`dist/` already includes the
  compiled JS/CSS and the icon font under `dist/fonts/`, copied there by
  that project's own `build.mjs`). Nothing in this repo modifies or
  duplicates those files — rebuilding the source project is immediately
  reflected here.

Clicking the icon again is a no-op — `init()` guards against re-initializing
an already-initialized page.

Permissions are limited to `activeTab` + `scripting` (inject only into the
tab you click on) and `storage` (persist the panel's activation state and
width). No host permissions, no always-on content script.
`web_accessible_resources` exposes `lib/fonts/*` so the icon font the
inspector panel uses can load when referenced from the injected CSS.

## Setting up `lib/` (local development)

```
./scripts/link-lib.sh                                    # defaults to the path below
./scripts/link-lib.sh /path/to/drupal-visual-debugger     # or pass an explicit checkout path
```

This replaces `lib/` with a symlink to that checkout's `dist/` folder. You
only need to re-run it if the checkout path changes; rebuilding
`drupal-visual-debugger` (`npm run build`) is picked up automatically since
`lib/` just points at its `dist/` output.

## Loading unpacked (development)

1. Visit `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" and select this folder.
4. Navigate to a Drupal page with Twig debugging enabled and click the
   extension's toolbar icon.

## License

GPL-2.0-or-later, matching the vendored `drupal-visual-debugger` library
(see `LICENSE`).
