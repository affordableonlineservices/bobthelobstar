/**
 * BoB the Lobstar — on-site chat widget.
 *
 * Drop this file into the root of your website repo alongside chat-widget.css.
 * Then add the following two lines before </body> on every HTML page:
 *
 *   <link rel="stylesheet" href="/chat-widget.css">
 *   <script src="/chat-widget.js" defer></script>
 *
 * Configure the bot endpoint below (BOB_BOT_URL). Memory-only session:
 * conversations reset on page refresh — no localStorage, no cookies.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Config. Change BOB_BOT_URL to your deployed Render URL.
  // ---------------------------------------------------------------------------
  const BOB_BOT_URL = 'https://bob-the-lobstar-bot.onrender.com/chat';
  const MAX_MESSAGE_CHARS = 1000; // must match MAX_MESSAGE_CHARS on the bot
  const PRIVACY_URL = '/privacy.html';

  // Fresh session per page load. crypto.randomUUID is supported in every
  // evergreen browser; a tiny fallback keeps us alive on older ones.
  const SESSION_ID = (crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'bob-' + Math.random().toString(36).slice(2) + '-' + Date.now();

  // One-shot guard so we never mount twice if this script is included on a
  // page that already has the widget (e.g. during migration).
  if (document.getElementById('bob-chat-root')) return;

  // ---------------------------------------------------------------------------
  // DOM construction. We build everything in JS so the host page doesn't need
  // to know anything about the widget's internals.
  // ---------------------------------------------------------------------------
  const root = document.createElement('div');
  root.id = 'bob-chat-root';
  root.innerHTML = `
    <button id="bob-chat-toggle" type="button"
            aria-label="Open chat with BoB" aria-expanded="false"
            aria-controls="bob-chat-panel">
      <span class="bob-chat-bubble-icon" aria-hidden="true">🦞</span>
      <span class="bob-chat-bubble-label">Ask BoB</span>
    </button>
    <section id="bob-chat-panel" role="dialog" aria-label="Chat with BoB the Lobstar"
             aria-hidden="true" hidden>
      <header class="bob-chat-header">
        <div class="bob-chat-title">
          <span class="bob-chat-title-icon" aria-hidden="true">🦞</span>
          <div>
            <div class="bob-chat-title-name">BoB the Lobstar</div>
            <div class="bob-chat-title-sub">AI assistant · usually replies in seconds</div>
          </div>
        </div>
        <button id="bob-chat-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div id="bob-chat-messages" class="bob-chat-messages" aria-live="polite"></div>
      <form id="bob-chat-form" class="bob-chat-form" autocomplete="off">
        <label for="bob-chat-input" class="bob-chat-sr">Your message</label>
        <textarea id="bob-chat-input" rows="1"
                  placeholder="Ask me about BoB..." maxlength="${MAX_MESSAGE_CHARS}"></textarea>
        <button id="bob-chat-send" type="submit" aria-label="Send message">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M3.4 20.6 22 12 3.4 3.4 3 10l13 2-13 2z"/>
          </svg>
        </button>
      </form>
      <footer class="bob-chat-footer">
        Messages are processed by AI and logged.
        <a href="${PRIVACY_URL}">Privacy</a>
      </footer>
    </section>
  `;
  document.body.appendChild(root);

  const toggle = root.querySelector('#bob-chat-toggle');
  const panel = root.querySelector('#bob-chat-panel');
  const closeBtn = root.querySelector('#bob-chat-close');
  const messagesEl = root.querySelector('#bob-chat-messages');
  const form = root.querySelector('#bob-chat-form');
  const input = root.querySelector('#bob-chat-input');
  const sendBtn = root.querySelector('#bob-chat-send');

  // ---------------------------------------------------------------------------
  // Open / close. We stash the opener so focus returns there on close — the
  // accessibility rule of thumb for dialogs.
  // ---------------------------------------------------------------------------
  function openPanel() {
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    // defer the focus so screen readers see the dialog transition first
    setTimeout(() => input.focus(), 50);
    if (!messagesEl.children.length) greet();
  }
  function closePanel() {
    panel.hidden = true;
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }
  toggle.addEventListener('click', () => {
    panel.hidden ? openPanel() : closePanel();
  });
  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  });

  // ---------------------------------------------------------------------------
  // Render helpers. We render text as plain text (not HTML) to avoid any chance
  // of an AI reply smuggling a <script> tag into the page.
  // ---------------------------------------------------------------------------
  function addMessage(role, text) {
    const wrap = document.createElement('div');
    wrap.className = 'bob-msg bob-msg-' + role;
    const bubble = document.createElement('div');
    bubble.className = 'bob-msg-bubble';
    bubble.textContent = text; // textContent — never innerHTML
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function addTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'bob-msg bob-msg-bot bob-msg-typing';
    wrap.innerHTML = '<div class="bob-msg-bubble"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return wrap;
  }

  function greet() {
    addMessage(
      'bot',
      "Hey there! I'm BoB, the friendly lobstar around here. Ask me anything about our seafood, orders, or the shop."
    );
  }

  // ---------------------------------------------------------------------------
  // Auto-grow textarea so long questions feel natural without adding a
  // full-blown rich editor.
  // ---------------------------------------------------------------------------
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  input.addEventListener('keydown', (e) => {
    // Enter sends; Shift+Enter inserts newline. Matches WhatsApp / Messenger.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // ---------------------------------------------------------------------------
  // Submit flow. Guarded so double-clicks don't fire two requests.
  // ---------------------------------------------------------------------------
  let inFlight = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (inFlight) return;
    const text = input.value.trim();
    if (!text) return;

    addMessage('user', text);
    input.value = '';
    input.style.height = 'auto';
    inFlight = true;
    sendBtn.disabled = true;
    const typing = addTyping();

    try {
      const res = await fetch(BOB_BOT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: SESSION_ID }),
      });
      typing.remove();
      if (!res.ok) {
        // Surface a friendly message instead of technical details. 429 is the
        // conventional "slow down" status but our bot returns 200 with a nice
        // reply for its own rate limits, so a non-2xx here means a real fault.
        addMessage('bot', "I'm having trouble reaching the kitchen right now. Mind trying again in a moment?");
        return;
      }
      const data = await res.json();
      addMessage('bot', data.reply || "Hmm, I didn't catch that. Try again?");
    } catch (err) {
      typing.remove();
      addMessage('bot', "Looks like my shell's offline for a second. Please try again.");
    } finally {
      inFlight = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });
})();
