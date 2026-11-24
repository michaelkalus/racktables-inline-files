/* RackTables Inline Files - client side.
 *
 * - Download icons (?module=download&file_id=N) open the original file in a new tab.
 * - Image previews ("click to zoom", ?module=download&...&asattach=no around an
 *   <img>) open in an in-page viewer: Esc or a click on the backdrop closes it,
 *   Left/Right arrows move between all images on the page.
 * - Ctrl/Cmd/Shift/middle click keeps the browser's default behavior.
 *
 * Which files on the page are images (for prev/next) is taken from the bold
 * file name in file cells (<a href="?page=file&file_id=N"><strong>name</strong></a>)
 * and, on a file's own page, from the "Type:" row of the summary.
 */
(function () {
  'use strict';

  var IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;
  var IMAGE_MIME = /^image\/(jpeg|png|gif|webp)$/i;

  function param(a, name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(a.getAttribute('href') || '');
    return m ? decodeURIComponent(m[1]) : null;
  }

  function isDownloadLink(a) {
    return a && a.tagName === 'A' && param(a, 'module') === 'download' && param(a, 'file_id') !== null;
  }

  // "Click to zoom" link of a resampled image preview. RackTables only
  // generates it for images, so no type detection is needed.
  function isPreviewLink(a) {
    return isDownloadLink(a) && param(a, 'asattach') === 'no' && !!a.querySelector('img');
  }

  function downloadUrl(id) {
    return 'index.php?module=download&file_id=' + encodeURIComponent(id);
  }

  // file_id -> {name, image}. Only the bold file name counts: other links to
  // the same file (tabs such as "Browse" or "Download", the icon) are ignored.
  function collectFiles() {
    var files = {};
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="page=file"][href*="file_id="] > strong'), function (s) {
      var a = s.parentNode;
      var id = param(a, 'file_id');
      var name = (s.textContent || '').trim();
      if (id && name && param(a, 'module') === null && param(a, 'tab') === null)
        files[id] = { name: name, image: IMAGE_EXT.test(name) };
    });
    // On the file's own page the "Type:" row of the summary is authoritative.
    var pageId = /[?&]page=file(&|$)/.test(location.search) ? (/[?&]file_id=(\d+)/.exec(location.search) || [])[1] : null;
    if (pageId) {
      Array.prototype.forEach.call(document.querySelectorAll('th'), function (th) {
        if ((th.textContent || '').trim() === 'Type:' && th.nextElementSibling) {
          var mime = (th.nextElementSibling.textContent || '').trim();
          var h1 = document.querySelector('h1');
          var name = (h1 && h1.textContent.trim()) || ('file ' + pageId);
          files[pageId] = { name: name, image: IMAGE_MIME.test(mime) };
        }
      });
    }
    return files;
  }

  var files = {};

  // All images on the page, in document order (for prev/next): files known to
  // be images plus anything that has a zoomable preview.
  function imageList() {
    var seen = {};
    var list = [];
    function add(id) {
      if (seen[id]) return;
      seen[id] = true;
      var f = files[id];
      list.push({ id: id, name: f ? f.name : 'file ' + id, href: downloadUrl(id) });
    }
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="file_id="]'), function (a) {
      var id = param(a, 'file_id');
      if (!id) return;
      if (isPreviewLink(a) || (files[id] && files[id].image && (isDownloadLink(a) || param(a, 'page') === 'file')))
        add(id);
    });
    // File page whose preview is too small to be zoomable: still list it.
    Object.keys(files).forEach(function (id) { if (files[id].image) add(id); });
    return list;
  }

  // --- viewer ---
  var box = null, img, caption, counter, openLink, list = [], index = 0;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function build() {
    box = el('div', 'if-viewer');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    var stage = el('div', 'if-stage');
    img = el('img', 'if-img');
    img.alt = '';
    stage.appendChild(img);
    var bar = el('div', 'if-bar');
    caption = el('span', 'if-caption');
    counter = el('span', 'if-counter');
    openLink = el('a', 'if-btn', 'Open in new tab');
    openLink.target = '_blank';
    openLink.rel = 'noopener';
    var close = el('button', 'if-btn', 'Close');
    close.type = 'button';
    close.addEventListener('click', hide);
    bar.appendChild(caption);
    bar.appendChild(counter);
    bar.appendChild(openLink);
    bar.appendChild(close);
    var prev = el('button', 'if-nav if-prev', '\u2039');
    var next = el('button', 'if-nav if-next', '\u203a');
    prev.type = next.type = 'button';
    prev.setAttribute('aria-label', 'Previous image');
    next.setAttribute('aria-label', 'Next image');
    prev.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    next.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    box.appendChild(stage);
    box.appendChild(prev);
    box.appendChild(next);
    box.appendChild(bar);
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target === stage) hide();
    });
    img.addEventListener('error', function () {
      caption.textContent = (list[index] ? list[index].name + ' - ' : '') + 'cannot be displayed, use "Open in new tab"';
    });
    document.body.appendChild(box);
  }

  function render() {
    var f = list[index];
    img.src = f.href;
    caption.textContent = f.name;
    counter.textContent = list.length > 1 ? (index + 1) + ' / ' + list.length : '';
    openLink.href = f.href;
    box.classList.toggle('if-single', list.length < 2);
  }

  function show(f) {
    if (!box) build();
    list = imageList();
    index = 0;
    for (var i = 0; i < list.length; i++)
      if (list[i].id === f.id) { index = i; break; }
    if (!list.length || list[index].id !== f.id) { list = [f]; index = 0; }
    render();
    box.classList.add('if-open');
    document.documentElement.classList.add('if-lock');
  }

  function hide() {
    if (!box) return;
    box.classList.remove('if-open');
    document.documentElement.classList.remove('if-lock');
    img.removeAttribute('src');
  }

  function step(d) {
    if (list.length < 2) return;
    index = (index + d + list.length) % list.length;
    render();
  }

  document.addEventListener('keydown', function (e) {
    if (!box || !box.classList.contains('if-open')) return;
    if (e.key === 'Escape') { hide(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!isDownloadLink(a)) return;
    if (isPreviewLink(a)) {
      var id = param(a, 'file_id');
      e.preventDefault();
      show({ id: id, name: files[id] ? files[id].name : 'file ' + id, href: downloadUrl(id) });
      return;
    }
    a.target = '_blank'; // download icon: original file in a new tab (default action follows)
    a.rel = 'noopener';
  });

  function start() {
    files = collectFiles();
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="module=download"]'), function (a) {
      if (isDownloadLink(a)) { a.target = '_blank'; a.rel = 'noopener'; }
    });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start);
  else
    start();
})();
