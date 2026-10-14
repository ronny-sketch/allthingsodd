// Cloudflare Turnstile for every form that writes to Growth OS: contact,
// Work with ODD, newsletter, ODDspace booking, Creative Week and ticket
// checkout. Once its TURNSTILE_SECRET is set, the Worker refuses those
// routes without a token (odd-growth-os worker/src/turnstile.ts).
//
// The widget is interaction-only, so most visitors never see it. When
// Cloudflare does want a click, it appears just above the submit button.
// api.js loads on the first focus inside a form, not on page load, so a
// page nobody fills in never fetches it.

const SITE_KEY: string = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAFW3-pMf8KOvsiQJ';
const API_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
// Long enough for a person to answer a challenge if one is shown.
const TOKEN_TIMEOUT_MS = 30_000;
// A script that never loads must not hold the form on "Sending…".
const LOAD_TIMEOUT_MS = 10_000;

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  execute(id: string): void;
  reset(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi | null> | undefined;

function loadApi(): Promise<TurnstileApi | null> {
  loading ??= new Promise((resolve) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement('script');
    script.src = API_URL;
    script.async = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => resolve(null);
    window.setTimeout(() => resolve(window.turnstile ?? null), LOAD_TIMEOUT_MS);
    document.head.append(script);
  });
  return loading;
}

// Start fetching api.js as soon as someone starts on a form, so pressing
// submit does not wait for it.
document.addEventListener('focusin', (e) => {
  if ((e.target as Element | null)?.closest?.('form')) void loadApi();
});

interface Widget {
  id: string;
  settle?: (token: string) => void;
}
const widgets = new WeakMap<HTMLElement, Widget>();

/**
 * Headers carrying a fresh single-use token, or none when Turnstile could
 * not run (blocked, offline, timed out). Sending without one is left to the
 * Worker, which answers in its own words, so nothing fails silently here.
 */
export async function turnstileHeaders(form: HTMLElement): Promise<Record<string, string>> {
  const api = await loadApi();
  if (!api) return {};

  const token = await new Promise<string>((resolve) => {
    let widget = widgets.get(form);
    const timer = window.setTimeout(() => settle(''), TOKEN_TIMEOUT_MS);
    function settle(value: string) {
      window.clearTimeout(timer);
      if (widget) widget.settle = undefined;
      resolve(value);
    }
    try {
      if (widget) {
        api.reset(widget.id);
      } else {
        const slot = document.createElement('div');
        slot.className = 'turnstile-slot';
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.before(slot);
        else form.append(slot);
        const entry: Widget = { id: '' };
        entry.id = api.render(slot, {
          sitekey: SITE_KEY,
          appearance: 'interaction-only',
          execution: 'execute',
          callback: (value: string) => entry.settle?.(value),
          'error-callback': () => entry.settle?.(''),
        });
        widgets.set(form, entry);
        widget = entry;
      }
      widget.settle = settle;
      api.execute(widget.id);
    } catch {
      settle('');
    }
  });

  return token ? { 'X-Turnstile-Token': token } : {};
}
