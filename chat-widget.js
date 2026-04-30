/**
 * BoB the Lobstar — inline chat embed.
 *
 * This is the INLINE variant: instead of a floating bubble, the chat renders
 * directly into an existing DOM element with id="bob-chat-embed" that lives
 * in the page flow. If that element doesn't exist on the current page, the
 * script is a no-op — which is what we want on sub-pages like privacy.html.
 *
 * Drop this file into the root of your website repo alongside chat-widget.css
 * and include them on any page where you want the chat:
 *
 *   <link rel="stylesheet" href="/chat-widget.css">
 *   <script src="/chat-widget.js" defer></script>
 *
 * And place the mount point wherever you want the chat to appear:
 *
 *   <section id="bob-chat-embed" data-bob-title="Talk to BoB"
 *            data-bob-sub="Ask about our seafood, orders, or the shop.">
 *   </section>
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

  // ---------------------------------------------------------------------------
  // Pre-warm the bot. Render's free tier sleeps containers after ~15 min idle,
  // so the first real chat request can take 30-60s while the dyno cold-starts.
  // We fire a wake-up request the moment this script loads so the container
  // is hot by the time the visitor finishes reading the page and types
  // something. We use no-cors mode + ignore the result because all we need
  // is for the request to hit Render's edge — the actual response doesn't
  // matter (a 404 still wakes the container).
  //
  // Hits the bot root, not /chat, so we don't trigger the LLM or pollute logs
  // with empty messages. If your bot has a /health endpoint, even better —
  // change BOB_PREWARM_URL to point at that.
  // ---------------------------------------------------------------------------
  const BOB_PREWARM_URL = BOB_BOT_URL.replace(/\/chat\/?$/, '/');
  try {
    fetch(BOB_PREWARM_URL, { method: 'GET', mode: 'no-cors', cache: 'no-store' })
      .catch(function () { /* swallow — best-effort warm-up */ });
  } catch (_) { /* never let pre-warm break the page */ }

  // Fresh session per page load. crypto.randomUUID is supported in every
  // evergreen browser; a tiny fallback keeps us alive on older ones.
  const SESSION_ID = (crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'bob-' + Math.random().toString(36).slice(2) + '-' + Date.now();

  function init() {
    const mount = document.getElementById('bob-chat-embed');
    // If the page doesn't opt in with a #bob-chat-embed container, do nothing.
    // That way the same script can ship on every page without mounting
    // anything uninvited.
    if (!mount) return;
    // Guard against double-mount (hot-reload, repeat includes, etc.).
    if (mount.dataset.bobMounted === '1') return;
    mount.dataset.bobMounted = '1';

    // Let pages override the intro copy via data attributes. Sensible
    // defaults kick in for anything that's not supplied.
    const title = mount.dataset.bobTitle || 'Got questions? Chat with BoB';
    const sub = mount.dataset.bobSub
      || "Ask about our seafood, orders, or anything else — BoB's happy to help.";
    const label = mount.dataset.bobLabel || 'AI Assistant';

    // -------------------------------------------------------------------------
    // DOM construction. Built in JS so the host page just needs the mount div.
    // -------------------------------------------------------------------------
    mount.innerHTML = `
      <div class="bob-embed-intro">
        <p class="bob-embed-label">${escapeHtml(label)}</p>
        <h2 class="bob-embed-title">${escapeHtml(title)}</h2>
        <p class="bob-embed-sub">${escapeHtml(sub)}</p>
      </div>
      <div class="bob-chat-card" role="region" aria-label="Chat with BoB the Lobstar">
        <header class="bob-chat-header">
          <span class="bob-chat-title-icon" aria-hidden="true">🦞</span>
          <div>
            <div class="bob-chat-title-name">BoB the Lobstar</div>
            <div class="bob-chat-title-sub">Usually replies in seconds</div>
          </div>
          <span class="bob-chat-status" aria-label="online">online</span>
        </header>
        <div id="bob-chat-messages" class="bob-chat-messages" aria-live="polite"></div>
        <form id="bob-chat-form" class="bob-chat-form" autocomplete="off">
          <label for="bob-chat-input" class="bob-chat-sr">Your message</label>
          <textarea id="bob-chat-input" rows="1"
                    placeholder="Ask BoB anything..."
                    maxlength="${MAX_MESSAGE_CHARS}"></textarea>
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
      </div>
    `;

    const messagesEl = mount.querySelector('#bob-chat-messages');
    const form = mount.querySelector('#bob-chat-form');
    const input = mount.querySelector('#bob-chat-input');
    const sendBtn = mount.querySelector('#bob-chat-send');

    // -------------------------------------------------------------------------
    // Render helpers. We render text as plain text (not HTML) to avoid any
    // chance of an AI reply smuggling a <script> tag into the page.
    // -------------------------------------------------------------------------
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

    // Open the conversation with BoB's hello — no user interaction required.
    addMessage(
      'bot',
      "Hey there! I'm BoB, the friendly lobstar around here. Ask me anything about our seafood, orders, or the shop."
    );

    // -------------------------------------------------------------------------
    // Auto-grow textarea so long questions feel natural.
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Streaming endpoint. Same host as BOB_BOT_URL but /chat/stream. Falls back
    // to the original JSON /chat if streaming fails (older browser, hostile
    // proxy mangling SSE, network issue, etc.).
    // -------------------------------------------------------------------------
    const BOB_BOT_STREAM_URL = BOB_BOT_URL.replace(/\/chat\/?$/, '/chat/stream');

    // -------------------------------------------------------------------------
    // Submit flow. Guarded so double-clicks don't fire two requests.
    // -------------------------------------------------------------------------
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
        // ---- Try streaming first --------------------------------------------
        const streamed = await sendStreaming(text, typing);
        if (streamed) return; // success path — sendStreaming handled UI

        // ---- Fallback: original JSON /chat ----------------------------------
        const res = await fetch(BOB_BOT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, session_id: SESSION_ID }),
        });
        typing.remove();
        if (!res.ok) {
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

    // -------------------------------------------------------------------------
    // sendStreaming — returns true on success, false to fall back to JSON.
    // Renders tokens into a single bot bubble as they arrive (live typing).
    // -------------------------------------------------------------------------
    async function sendStreaming(text, typing) {
      let res;
      try {
        res = await fetch(BOB_BOT_STREAM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify({ message: text, session_id: SESSION_ID }),
        });
      } catch (e) {
        return false; // network error — let JSON fallback try
      }
      if (!res.ok || !res.body) return false;

      // Swap the typing dots for a real (initially empty) bot bubble that
      // we'll grow as chunks arrive.
      typing.remove();
      const bubble = addMessage('bot', '');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buf = '';
      let gotAnyText = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // SSE events are separated by blank lines (\n\n).
          let eventEnd;
          while ((eventEnd = buf.indexOf('\n\n')) !== -1) {
            const rawEvent = buf.slice(0, eventEnd);
            buf = buf.slice(eventEnd + 2);

            // Each event has one or more "data: ..." lines. We only care
            // about data lines and concatenate them.
            const dataLines = rawEvent.split('\n')
              .filter(l => l.startsWith('data:'))
              .map(l => l.slice(5).trimStart());
            if (!dataLines.length) continue;
            const dataStr = dataLines.join('\n');

            let payload;
            try { payload = JSON.parse(dataStr); }
            catch (_) { continue; } // ignore malformed event

            if (payload.text) {
              bubble.textContent += payload.text;
              gotAnyText = true;
              messagesEl.scrollTop = messagesEl.scrollHeight;
            }
            if (payload.done) {
              if (!gotAnyText) bubble.textContent = "Hmm, I didn't catch that. Try again?";
              return true;
            }
            if (payload.error) {
              bubble.textContent = bubble.textContent || payload.error;
              return true;
            }
          }
        }
        // Stream ended without an explicit {done: true}. If we got tokens,
        // that's still a success.
        if (!gotAnyText) {
          bubble.remove();
          return false;
        }
        return true;
      } catch (e) {
        // Mid-stream failure. If we already started rendering, keep what we
        // have and append a soft note. Otherwise let JSON fallback handle it.
        if (gotAnyText) {
          bubble.textContent += '\n\n(Connection dropped — try sending again for the rest.)';
          return true;
        }
        bubble.remove();
        return false;
      }
    }
  }

  // Used when we inject user-supplied data attributes into the intro copy so
  // nothing nasty lands as raw HTML. textContent would do too but we need
  // the string form for the innerHTML template.
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Mount on DOMContentLoaded if the document hasn't already loaded.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
