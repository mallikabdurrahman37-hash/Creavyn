/* CREAVYN AI chatbot — vanilla JS, no dependencies. Loaded lazily (after idle) by main.js.
   Talks only to the deployed backend; no API keys or secrets live in the frontend. */
(function () {
  'use strict';
  if (window.__creavynChat) return;
  window.__creavynChat = true;

  var API = 'https://creavyn-ai-backend.onrender.com/api/chat';
  var STORE = 'creavyn-chat-v1';
  var MAX_SEND = 12;          // most recent messages sent to the backend
  var MAX_CHARS = 1000;       // max length of one visitor message
  var SLOW_MS = 8000;         // show "waking up" note (free hosts can cold-start)
  var TIMEOUT_MS = 60000;     // give up after this long
  var WA = 'https://wa.me/919239529167';
  var EMAIL = 'creavyn.in@gmail.com';

  var cs = document.currentScript;
  var BASE = cs && cs.src ? cs.src.replace(/[^\/]*$/, '') : '';
  var IMG = BASE + 'chatbot-launcher.png';

  var root = document.documentElement;
  var doc = document;
  var reduce = window.matchMedia('(prefers-reduced-motion:reduce)');
  var sheet = window.matchMedia('(max-width:640px),(max-height:520px)'); // full-screen layout
  var coarse = window.matchMedia('(pointer:coarse)');

  var WELCOME = "Hi, I'm the CREAVYN assistant. I can tell you about our studio, services, work and pricing, or help you get in touch. What would you like to know?";
  var SUGGEST = [
    ['About CREAVYN', 'Tell me about CREAVYN.'],
    ['Services', 'What services does CREAVYN offer?'],
    ['Our Work', 'Can you tell me about CREAVYN\u2019s work and past projects?'],
    ['Pricing', 'What is your pricing?'],
    ['Contact', 'How can I contact CREAVYN?']
  ];

  /* ---------- state ---------- */
  var history = [];      // [{role:'user'|'assistant', content}] — the welcome message is not part of it
  var busy = false;
  var isOpen = false;
  var gen = 0;           // bumps on "new chat" so late replies from an old chat are ignored
  var ctrl = null;

  function load() {
    try {
      var d = JSON.parse(sessionStorage.getItem(STORE) || 'null');
      if (d && Array.isArray(d.m)) history = d.m.filter(function (x) { return x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string'; }).slice(-40);
    } catch (e) { history = []; }
  }
  function save() { updateCopy(); try { sessionStorage.setItem(STORE, JSON.stringify({ m: history.slice(-40) })); } catch (e) {} }

  /* ---------- DOM ---------- */
  function h(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var ICON = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h11v11H9zM5 15V4h11"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'
  };

  var wrap = h('div', 'cb-root');
  wrap.innerHTML =
    '<button class="cb-launcher" type="button" aria-label="Chat with the CREAVYN assistant" aria-expanded="false" aria-controls="cbPanel">' +
      '<img src="' + IMG + '" alt="" width="300" height="324" decoding="async"><span class="cb-tip" aria-hidden="true">Ask our AI assistant</span>' +
    '</button>' +
    '<div class="cb-panel" id="cbPanel" role="dialog" aria-label="CREAVYN assistant chat" tabindex="-1" hidden>' +
      '<div class="cb-head">' +
        '<span class="cb-avatar" aria-hidden="true"><img src="' + IMG + '" alt="" width="300" height="324" decoding="async"></span>' +
        '<div class="cb-title"><h2>CREAVYN Assistant</h2><p>AI assistant</p></div>' +
        '<button class="cb-hbtn" type="button" data-act="copy" aria-label="Copy entire chat" title="Copy chat" disabled>' + ICON.copy + '</button>' +
        '<button class="cb-hbtn" type="button" data-act="reset" aria-label="Start a new chat" title="New chat">' + ICON.reset + '</button>' +
        '<button class="cb-hbtn" type="button" data-act="close" aria-label="Close chat" title="Close">' + ICON.close + '</button>' +
      '</div>' +
      '<div class="cb-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation"></div>' +
      '<div class="cb-sugg" role="group" aria-label="Suggested questions"></div>' +
      '<form class="cb-form" autocomplete="off">' +
        '<label class="sr" for="cbInput">Type your message</label>' +
        '<textarea class="cb-input" id="cbInput" rows="1" maxlength="' + MAX_CHARS + '" placeholder="Type your message\u2026" enterkeyhint="send"></textarea>' +
        '<button class="cb-send" type="submit" aria-label="Send message" disabled>' + ICON.send + '</button>' +
      '</form>' +
      '<p class="cb-foot">AI replies may contain mistakes</p>' +
    '</div>';

  var launcher = wrap.querySelector('.cb-launcher');
  var panel = wrap.querySelector('.cb-panel');
  var log = wrap.querySelector('.cb-log');
  var sugg = wrap.querySelector('.cb-sugg');
  var form = wrap.querySelector('.cb-form');
  var input = wrap.querySelector('.cb-input');
  var sendBtn = wrap.querySelector('.cb-send');
  var copyBtn = wrap.querySelector('[data-act="copy"]');

  // If the launcher artwork can't load, keep a usable text button instead of an empty gap.
  launcher.querySelector('img').addEventListener('error', function () {
    this.remove();
    launcher.style.cssText += ';width:auto;aspect-ratio:auto;padding:0 18px;min-height:52px;background:#0A0A0A;color:#EFEFEF;font:700 12px/1 var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;border-left:3px solid #FF4A1C';
    launcher.insertAdjacentText('afterbegin', 'Chat');
  });

  /* ---------- safe formatting of AI replies (escape first, then a tiny markdown subset) ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var TOKEN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]])|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})|(\+?\d[\d ]{8,}\d)|\*\*([^*\n]+)\*\*/g;
  function inline(raw) {
    return esc(raw).replace(TOKEN, function (m, lt, lu, url, mail, tel, bold) {
      if (lu) return '<a href="' + lu + '" target="_blank" rel="noopener noreferrer">' + lt + '</a>';
      if (url) return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
      if (mail) return '<a href="mailto:' + mail + '">' + mail + '</a>';
      if (tel) { var d = tel.replace(/\D/g, ''); return d.length >= 10 && d.length <= 13 ? '<a href="tel:+' + (d.length === 10 ? '91' : '') + d + '">' + tel + '</a>' : tel; }
      if (bold) return '<strong>' + bold + '</strong>';
      return m;
    });
  }
  function format(text) {
    var out = [], list = null, para = [];
    function flushPara() { if (para.length) { out.push('<p>' + para.join('<br>') + '</p>'); para = []; } }
    function flushList() { if (list) { out.push('<' + list.t + '>' + list.i.join('') + '</' + list.t + '>'); list = null; } }
    String(text).replace(/\r/g, '').split('\n').forEach(function (line) {
      var ul = /^\s*[-*\u2022]\s+(.*)$/.exec(line), ol = /^\s*\d+[.)]\s+(.*)$/.exec(line), hd = /^\s*#{1,6}\s+(.*)$/.exec(line);
      if (ul || ol) {
        flushPara();
        var t = ul ? 'ul' : 'ol';
        if (list && list.t !== t) flushList();
        if (!list) list = { t: t, i: [] };
        list.i.push('<li>' + inline((ul || ol)[1]) + '</li>');
      } else if (!line.trim()) { flushPara(); flushList(); }
      else if (hd) { flushPara(); flushList(); out.push('<p><strong>' + inline(hd[1]) + '</strong></p>'); }
      else { flushList(); para.push(inline(line.trim())); }
    });
    flushPara(); flushList();
    return out.join('') || '<p></p>';
  }

  /* ---------- rendering ---------- */
  function toBottom() { log.scrollTop = log.scrollHeight; }
  function addMsg(role, text, kind) {
    var m = h('div', 'cb-msg ' + (role === 'user' ? 'user' : 'bot') + (kind ? ' ' + kind : ''));
    m.appendChild(h('p', 'cb-who', role === 'user' ? 'You' : 'CREAVYN'));
    var b = h('div', 'cb-bubble');
    if (role === 'user') b.textContent = text; else b.innerHTML = format(text);
    m.appendChild(b);
    log.appendChild(m);
    return m;
  }
  function showBotMsg(m) { // long replies start at their top so reading begins at the beginning
    if (m.offsetHeight > log.clientHeight * 0.8) log.scrollTop = Math.max(0, m.offsetTop - 12); else toBottom();
  }
  function renderAll() {
    log.innerHTML = '';
    addMsg('bot', WELCOME);
    history.forEach(function (x) { addMsg(x.role === 'user' ? 'user' : 'bot', x.content); });
    sugg.hidden = history.length > 0;
    toBottom();
  }
  function buildSuggestions() {
    SUGGEST.forEach(function (s) {
      var c = h('button', 'cb-chip'); c.type = 'button'; c.textContent = s[0]; c.setAttribute('data-q', s[1]);
      sugg.appendChild(c);
    });
  }

  function typing() {
    var m = h('div', 'cb-msg bot');
    m.appendChild(h('p', 'cb-who', 'CREAVYN'));
    var b = h('div', 'cb-bubble');
    b.innerHTML = '<div class="cb-typing" role="status" aria-label="CREAVYN assistant is typing"><i></i><i></i><i></i></div>';
    m.appendChild(b); log.appendChild(m); toBottom();
    return m;
  }

  function errorMsg(e) {
    var txt;
    if (e && e.aborted) txt = 'The assistant is taking too long to respond right now.';
    else if (e && e.status === 429) txt = 'Too many messages in a short time. Please wait a moment and try again.';
    else if (e && e.status === 400) txt = 'I couldn\u2019t process that message. Please try rephrasing it.';
    else txt = 'I can\u2019t reach the assistant right now.';
    var m = addMsg('bot', txt, 'err');
    var b = m.querySelector('.cb-bubble');
    var p = h('p', null, 'You can also reach us on <a href="' + WA + '" target="_blank" rel="noopener noreferrer">WhatsApp</a> or at <a href="mailto:' + EMAIL + '">' + EMAIL + '</a>.');
    p.style.marginTop = '9px';
    b.appendChild(p);
    var r = h('button', 'cb-retry', 'Try again'); r.type = 'button'; r.setAttribute('data-retry', '1');
    b.appendChild(r);
    toBottom();
  }

  /* ---------- copy whole chat ---------- */
  function updateCopy() { if (copyBtn) copyBtn.disabled = !history.length; }
  function chatText() {
    return 'CREAVYN chat\n\n' + history.map(function (x) { return (x.role === 'user' ? 'You' : 'CREAVYN') + ': ' + x.content; }).join('\n\n');
  }
  function legacyCopy(t) {
    var ta = h('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    doc.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
    var ok = false; try { ok = doc.execCommand('copy'); } catch (e) {}
    ta.remove(); return ok;
  }
  function copyChat() {
    if (!history.length) return;
    var t = chatText();
    function done(ok) {
      copyBtn.innerHTML = ok ? ICON.check : ICON.copy;
      copyBtn.classList.toggle('done', ok);
      copyBtn.setAttribute('aria-label', ok ? 'Chat copied' : 'Copy entire chat');
      setTimeout(function () { copyBtn.innerHTML = ICON.copy; copyBtn.classList.remove('done'); copyBtn.setAttribute('aria-label', 'Copy entire chat'); }, 1800);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(legacyCopy(t)); });
    else done(legacyCopy(t));
  }

  /* ---------- sending ---------- */
  function setBusy(v) {
    busy = v;
    panel.setAttribute('aria-busy', v ? 'true' : 'false');
    updateSend();
  }
  function updateSend() { sendBtn.disabled = busy || !input.value.trim(); }
  function autosize() {
    input.style.height = 'auto';
    var extra = input.offsetHeight - input.clientHeight;
    input.style.height = Math.min(input.scrollHeight + extra, 120) + 'px';
  }
  function trimmed() {
    var a = history.slice(-MAX_SEND);
    while (a.length && a[0].role !== 'user') a.shift();
    return a;
  }

  function request() {
    var myGen = gen;
    setBusy(true);
    var t = typing();
    var slow = setTimeout(function () {
      var b = t.querySelector('.cb-bubble');
      if (b && !b.querySelector('.cb-note')) { b.appendChild(h('p', 'cb-note', 'Taking a little longer than usual\u2026')); toBottom(); }
    }, SLOW_MS);
    ctrl = window.AbortController ? new AbortController() : null;
    var timedOut = false;
    var to = setTimeout(function () { timedOut = true; if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: trimmed() }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) throw { status: res.status };
        var reply = data && typeof data.reply === 'string' ? data.reply.trim() : '';
        if (!reply) throw { status: 0 };
        return reply;
      });
    }).then(function (reply) {
      if (myGen !== gen) return;
      t.remove();
      history.push({ role: 'assistant', content: reply }); save();
      showBotMsg(addMsg('bot', reply));
    }).catch(function (e) {
      if (myGen !== gen) return;
      t.remove();
      errorMsg(e && e.status != null ? e : { aborted: timedOut });
    }).then(function () {
      clearTimeout(slow); clearTimeout(to);
      if (myGen !== gen) return;
      setBusy(false);
      if (isOpen && !coarse.matches) input.focus();
    });
  }

  function send(text) {
    text = (text || '').trim().slice(0, MAX_CHARS);
    if (!text || busy) return;           // blocks duplicate submissions while a request is in flight
    sugg.hidden = true;
    history.push({ role: 'user', content: text }); save();
    addMsg('user', text); toBottom();
    input.value = ''; autosize(); updateSend();
    request();
  }

  function reset() {
    gen++;
    if (ctrl) { try { ctrl.abort(); } catch (e) {} }
    history = []; save();
    setBusy(false);
    renderAll();
    input.value = ''; autosize(); updateSend();
    if (!coarse.matches) input.focus();
  }

  /* ---------- open / close, mobile keyboard, scroll lock ---------- */
  function fit() {
    var v = window.visualViewport;
    // Normally the sheet is simply 100dvh. Only when a soft keyboard shrinks the *visual* viewport
    // (iOS / some Android browsers) do we size the sheet to the visible area.
    var kb = isOpen && sheet.matches && v && doc.activeElement === input && (window.innerHeight - v.height) > 120;
    if (kb) {
      panel.style.setProperty('--cb-vh', v.height + 'px');
      panel.style.setProperty('--cb-top', v.offsetTop + 'px');
    } else {
      panel.style.removeProperty('--cb-vh');
      panel.style.removeProperty('--cb-top');
    }
    root.classList.toggle('cb-lock', isOpen && sheet.matches);
    if (isOpen) toBottomIfNearEnd();
  }
  function toBottomIfNearEnd() { if (log.scrollHeight - log.scrollTop - log.clientHeight < 160) toBottom(); }

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.hidden = false;
    root.classList.add('cb-open');
    launcher.classList.remove('cb-hint');
    launcher.setAttribute('aria-expanded', 'true');
    fit();
    toBottom();
    // on touch devices don't pop the keyboard straight away; it would cover the suggestions
    if (coarse.matches) panel.focus({ preventScroll: true }); else input.focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true;
    root.classList.remove('cb-open', 'cb-lock');
    launcher.setAttribute('aria-expanded', 'false');
    fit();
    launcher.focus({ preventScroll: true });
  }

  /* ---------- events ---------- */
  launcher.addEventListener('click', open);
  panel.addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]');
    if (a) { var act = a.getAttribute('data-act'); if (act === 'close') close(); else if (act === 'copy') copyChat(); else reset(); return; }
    var c = e.target.closest('.cb-chip');
    if (c) { send(c.getAttribute('data-q')); return; }
    var r = e.target.closest('[data-retry]');
    if (r && !busy) { var m = r.closest('.cb-msg'); if (m) m.remove(); request(); }
  });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
  input.addEventListener('input', function () { autosize(); updateSend(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); send(input.value); }
  });
  input.addEventListener('blur', function () { setTimeout(fit, 150); });
  input.addEventListener('focus', function () { setTimeout(function () { if (isOpen) { fit(); toBottomIfNearEnd(); } }, 250); });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fit);
    window.visualViewport.addEventListener('scroll', fit);
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 250); });
  if (sheet.addEventListener) sheet.addEventListener('change', fit);

  /* ---------- go ---------- */
  load();
  updateCopy();
  buildSuggestions();
  renderAll();
  updateSend();
  doc.body.appendChild(wrap);
  launcher.classList.add('cb-hint');
  setTimeout(function () { launcher.classList.remove('cb-hint'); }, 9000);
})();
