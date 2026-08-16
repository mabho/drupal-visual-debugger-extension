## Short description (132 char max, currently 111)

See Drupal's Twig theme-debug info as an on-page overlay: template suggestions, file paths, an inspector panel.

## Detailed description

Drupal Visual Debugger overlays your site's Twig theme-debug output directly
on the rendered page, so you can see which template Drupal used for any
element without digging through page source or enabling Devel/Kint.

Turn it on from the toolbar icon and every themeable element on the page —
nodes, blocks, views, fields, and more — gets a highlighted overlay. Click
one to open the inspector panel and see:

• Object type and theme hook (e.g. node__article)
• The full list of template suggestions Drupal considered, with the one
  actually used marked
• The active template's file path, one click to copy
• An Items tab listing every themeable element on the page three ways:
  Listed (a flat list), Branched (a tree showing how elements nest inside
  each other), and Grouped (bucketed by type, each type with its own
  show/hide-all switch) — pick whichever view fits what you're debugging
• A Cache tab (when the site also has render cache debugging on) showing
  cache hit/miss, cache tags, contexts, keys, and max-age for every
  cacheable render array on the page

The debugger stays on as you navigate the site — click the icon again to
turn it off, no page reload required either way. It only requests access to
a site the moment you turn it on there, not to every website up front.

Requirements: the site must have Twig debugging enabled
(services.yml -> twig.config.debug: true, or the development.services.yml
override) for the overlay and Items tab. Without it, Drupal doesn't emit
the HTML comments this extension reads, and there's nothing to overlay.
The Cache tab needs a separate setting, renderer.config.debug: true in the
same file — it's independent of Twig debugging, so you can enable either
without the other.

This extension is a thin client for the open-source drupal-visual-debugger
library (GPL-2.0-or-later) — it doesn't send data anywhere or modify your
site; everything runs locally in the browser tab.
