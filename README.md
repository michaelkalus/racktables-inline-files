# RackTables Inline Files

A [RackTables](https://www.racktables.org/) plugin that makes attached files easier to look at:

- **PDFs, images and plain text open in the browser** instead of being downloaded.
  Other types (zip, office documents, configs, ...) are still downloaded.
- **Download links open in a new tab**, so you do not lose the page you were on.
- **Images open in an in-page viewer** with previous/next navigation across all images
  on the page (handy for rack photos). Esc or a click outside closes it, Left/Right
  arrows switch images, "Open in new tab" shows the original.
- **File names with spaces and non-ASCII characters** are preserved when saving
  (RFC 5987 `filename*`).

No RackTables core file is modified.

## Compatibility

Tested with RackTables **0.22.0** (PHP 8.3). Should work with 0.21.x (same plugin
architecture), but that has not been verified.

## Installation

1. Copy the `inlinefiles` directory into the RackTables `plugins/` directory:

   ```
   plugins/
     inlinefiles/
       plugin.php
       css/inlinefiles.css
       js/inlinefiles.js
   ```

2. In RackTables, open **Configuration -> Plugins**, find **Inline Files** and click **Install**.
3. Reload the page (hard refresh, e.g. Ctrl+Shift+R).

To remove it, click **Uninstall** in the same place; nothing is stored in the database
apart from the plugin record.

### Docker image

```dockerfile
COPY inlinefiles /var/www/racktables/plugins/inlinefiles
```

## How it works

**Server side.** For `?module=download` requests, `plugin_inlinefiles_init()` registers a
`header_register_callback()`. It runs right before PHP sends the response headers and
replaces RackTables' `Content-Disposition: attachment; filename=...` with:

- `inline` for `application/pdf`, `image/jpeg|png|gif|webp` and `text/plain`,
- `attachment` for everything else,

always with an RFC 5987 encoded file name, plus `X-Content-Type-Options: nosniff`.
`text/html` and SVG are deliberately never sent inline, so an uploaded file cannot run
script in the RackTables origin. Requests with `asattach=no` (RackTables' own image
zoom link) are left untouched.

**Client side.** `js/inlinefiles.js` (plain JavaScript, no dependencies) sets
`target=_blank` on download links and intercepts clicks on image links. The file type is
taken from the file name shown next to the link, or from the "Type:" row on a file's own
page; links whose type cannot be determined just open in a new tab. Ctrl/Cmd/Shift/middle
click keeps the browser's default behavior.

## License

GPL-2.0, the same as RackTables. See [LICENSE](LICENSE).
