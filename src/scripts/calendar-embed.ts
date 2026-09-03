// Consent gate for the ODDspace Google Calendar embed.
//
// Before 2026-09-03 this iframe loaded on every ODDspace page view
// regardless of what the visitor had told the cookie banner — the banner
// only ever knew about GA4. An embedded third-party frame is exactly what
// ePrivacy Article 5(3) covers: Google sets cookies as soon as it loads, and
// nothing about a venue calendar makes that "strictly necessary."
//
// The URL lives in `data-src` in oddspace.astro rather than `src`, which is
// what actually makes this a gate: markup that never carries a real `src`
// cannot start a request early, no matter when this script runs or whether
// it runs at all.
import { onConsentChange } from './consent';

const container = document.querySelector<HTMLElement>('[data-calendar-embed]');
const frame = container?.querySelector<HTMLIFrameElement>('iframe[data-src]');
const placeholder = container?.querySelector<HTMLElement>('[data-calendar-placeholder]');
const loadButton = container?.querySelector<HTMLButtonElement>('[data-calendar-load]');

if (container && frame && placeholder && loadButton) {
  const load = () => {
    if (frame.src) return;
    const src = frame.dataset.src;
    if (!src) return;
    frame.src = src;
    frame.hidden = false;
    placeholder.hidden = true;
  };

  onConsentChange((state) => {
    if (state.preferences) load();
  });

  // A per-visit escape hatch, not a consent grant: pressing this loads the
  // calendar now and stores nothing. Someone who wants the embed every time
  // uses the footer's "Cookie settings" instead — which is why this button
  // deliberately does NOT write `preferences: true` on the visitor's behalf.
  // Consent has to be an unambiguous affirmative action about the category,
  // not a side effect of wanting to see one calendar.
  // The durable choice is deliberately not offered here as a second button:
  // the placeholder links to /privacy/, which carries both the explanation
  // and its own "Cookie settings" control, so the two paths don't compete
  // for the same moment of attention.
  loadButton.addEventListener('click', () => load());
}
