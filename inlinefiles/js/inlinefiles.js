/* RackTables Inline Files - client side.
 *
 * - Every download link (?module=download&file_id=N) opens in a new tab.
 * - Links to images open in an in-page viewer instead: Esc or a click on the
 *   backdrop closes it, Left/Right arrows move between images on the page.
 * - Ctrl/Cmd/Shift/middle click keeps the browser's default behavior.
 *
 * The file type is taken from the file name shown next to the link
 * (?page=file&file_id=N), or from the "Type:" row on the file's own page.
 * Links whose type cannot be determined simply open in a new tab.
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

  // file_id -> {name, image}
  function collectFiles() {
    var files = {};
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="page=file"][href*="file_id="]'), function (a) {
      var id = param(a, 'file_id');
      var name = (a.textContent || '').trim();
      if (id && name && param(a, 'module') === null)
        files[id] = { name: name, image: IMAGE_EXT.test(name) };
    });
    // On the file's own page the name is not a link, but the summary has "Type:".
    var pageId = /[?&]page=file(&|$)/.test(location.search) ? (/[?&]file_id=(\d+)/.exec(location.search) || [])[1] : null;
    if (pageId && !files[pageId]) {
      Array.prototype.forEach.call(document.querySelectorAll('th'), function (th) {
        if ((th.textContent || '').trim() === 'Type:' && th.nextElementSibling) {
          var mime = (th.nextElementSibling.textContent || '').trim();
          files[pageId] = { name: document.title || ('file ' + pageId), image: IMAGE_MIME.test(mime) };
        }
      });
    }
    return files;
  }

  var files = {};

  function fileOf(a) {
    var id = param(a, 'file_id');
    var f = files[id];
    // The resampled preview ("click to zoom") wraps an <img>: always an image.
    if (!f && a.querySelector('img') && param(a, 'asattach') === 'no')
      f = { name: 'file ' + id, image: true };
    return f ? { id: id, name: f.name, image: f.image, href: a.href } : null;
  }

  // Unique image links on the page, in document order (for prev/next).
  function imageList() {
    var seen = {};
    var list = [];
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="module=download"]'), function (a) {
      if (!isDownloadLink(a)) return;
      var f = fileOf(a);
      if (f && f.image && !seen[f.id]) {
        seen[f.id] = true;
        list.push(f);
      }
    });
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
    var f = fileOf(a);
    if (f && f.image) {
      e.preventDefault();
      show(f);
      return;
    }
    a.target = '_blank'; // everything else: new tab (the default action follows)
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
