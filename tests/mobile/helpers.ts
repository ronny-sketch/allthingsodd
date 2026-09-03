import type { Page } from '@playwright/test';

/** Every public route, including the ticketing flow and the 404. */
export const ROUTES = [
  '/',
  '/oddfest',
  '/oddference',
  '/oddspace',
  '/work-with-odd',
  '/oddagency',
  '/about',
  '/media',
  '/membership',
  '/contact',
  '/tickets',
  '/tickets/checkout',
];

/** The phone/tablet widths this pass treats as first-class. */
export const MOBILE_WIDTHS = [320, 360, 375, 390, 393, 412, 430, 768, 820];

/**
 * Suppresses the two timed interruptions so they can't cover the thing under
 * test. Both are exercised on purpose by their own specs instead.
 */
export async function suppressInterruptions(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('oddNewsletterPopupSeen', '1');
    // Matches src/scripts/analytics.ts's CONSENT_KEY / 'denied' value.
    localStorage.setItem('odd_analytics_consent_v1', 'denied');
  });
}

/**
 * Scrolls to the true end of the page at a realistic flick pace.
 *
 * Deliberately not the slow 150px/120ms crawl tests/visual/pages.spec.ts
 * uses: the point here is to behave like a real reader, so that anything
 * which only reveals under an unrealistically gentle scroll fails.
 *
 * The repeat-until-converged loop matters and is not defensive padding —
 * lazily-loaded images and the ODDspace calendar iframe keep growing the
 * document while this runs, so a single pass sized from an up-front
 * scrollHeight stops well short of the real end and reports sections that
 * were simply never visited as if they were broken.
 */
export async function scrollToEnd(page: Page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.9);
    for (let pass = 0; pass < 6; pass++) {
      let y = window.scrollY;
      let guard = 0;
      while (guard++ < 500) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (y >= max) break;
        y = Math.min(y + step, max);
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        await new Promise((r) => setTimeout(r, 50));
      }
      await new Promise((r) => setTimeout(r, 400));
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY >= max - 2) break;
    }
    await new Promise((r) => setTimeout(r, 500));
  });
}

export interface HiddenElement {
  cls: string;
  height: number;
  opacity: string;
}

/**
 * Elements whose transparency is the mechanism, not a fault — each one's
 * words or picture are on screen via something else. Kept as an explicit,
 * reasoned list rather than loosening the check, so a genuinely-hidden
 * section can never slip through as "probably one of those".
 */
const INVISIBLE_BY_DESIGN = [
  // WarpingText replaces the real heading with an SVG rendering of the same
  // words layered directly over it; the heading itself stays in the DOM as
  // the accessible/selectable copy and is faded out. The measuring node and
  // the displacement-map canvas are its off-screen working surfaces.
  '.warping-fallback--hidden',
  '.warping-measure',
  '.warping-canvas',
  // SpaceHero's mobile crossfade: cells 5-8 are the second photograph in
  // each of the four slots and spend most of their cycle at opacity 0 by
  // definition. Their slot always has a visible photo in it.
  '.space-hero-cell.cell-5',
  '.space-hero-cell.cell-6',
  '.space-hero-cell.cell-7',
  '.space-hero-cell.cell-8',
  // The video layer before playback is confirmed — the poster is what is on
  // screen (see src/scripts/autoplay-video.ts).
  '[data-video-stage] video',
];

/**
 * Elements that are laid out and take real space but are painted at opacity
 * 0 — i.e. content a visitor cannot see. Anything inside a `display: none`
 * ancestor is excluded: it isn't rendered at all, so it is hidden by design
 * (FloatingCloud is hidden wholesale below 820px), not invisible content.
 */
export async function invisibleContent(page: Page): Promise<HiddenElement[]> {
  return page.evaluate((allow: string[]) => {
    return [...document.querySelectorAll<HTMLElement>('body *')]
      .filter((el) => {
        if (!el.getClientRects().length) return false;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden') return false;
        if (parseFloat(cs.opacity) > 0.01) return false;
        const r = el.getBoundingClientRect();
        if (r.height <= 24 || r.width <= 24) return false;
        return !allow.some((sel) => el.matches(sel));
      })
      .map((el) => ({
        cls: `${el.tagName.toLowerCase()}.${el.getAttribute('class') || ''}`.slice(0, 90),
        height: Math.round(el.getBoundingClientRect().height),
        opacity: getComputedStyle(el).opacity,
      }));
  }, INVISIBLE_BY_DESIGN);
}
