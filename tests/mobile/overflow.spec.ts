import { test, expect } from '@playwright/test';
import { MOBILE_WIDTHS, ROUTES, suppressInterruptions } from './helpers';

/*
  Horizontal-overflow regression, per route and per mobile width.

  Two assertions, deliberately, because either alone is misleading:

  1. The document must not scroll horizontally.
  2. No element may escape the viewport box.

  (2) exists because `body { overflow-x: hidden }` has been in global.css for
  a long time, and it makes (1) pass whether or not the layout is actually
  correct — an element 200px past the right edge is simply clipped, silently.
  A failure here names the offending element, its box and the viewport, so
  the geometry can be fixed at the source instead of hidden again.

  Elements genuinely contained by an ancestor that clips them (the full-bleed
  marquees, the mosaic) are excluded: their overhang is intentional, bounded,
  and adds nothing to the document's scroll width.
*/

const scanForEscapes = () => {
  const vw = document.documentElement.clientWidth;
  const out: string[] = [];
  const seen = new Set<string>();
  document.querySelectorAll<HTMLElement>('body *').forEach((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (!el.getClientRects().length) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const overRight = r.right - vw;
    const overLeft = -r.left;
    if (overRight <= 1 && overLeft <= 1) return;

    // Contained by an ancestor that clips horizontally and is itself inside
    // the viewport → intentional, bounded full-bleed, not a defect.
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.overflowX === 'hidden' || pcs.overflowX === 'clip' || pcs.overflowX === 'auto') {
        const pr = p.getBoundingClientRect();
        if (pr.right <= vw + 1 && pr.left >= -1) return;
      }
      p = p.parentElement;
    }

    const key = `${el.tagName}.${el.getAttribute('class') || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(
      `<${el.tagName.toLowerCase()} class="${el.getAttribute('class') || ''}"> ` +
        `[${cs.position}] left=${Math.round(r.left)} right=${Math.round(r.right)} ` +
        `width=${Math.round(r.width)} viewport=${vw}`,
    );
  });
  return out;
};

for (const width of MOBILE_WIDTHS) {
  test.describe(`${width}px wide`, () => {
    test.use({ viewport: { width, height: 844 } });

    for (const route of ROUTES) {
      test(`${route} — no horizontal overflow`, async ({ page }) => {
        await suppressInterruptions(page);
        await page.goto(route);
        await page.waitForLoadState('load');
        await page.waitForTimeout(1200);

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(
          scrollWidth,
          `document scrolls horizontally at ${width}px on ${route}: ${scrollWidth} > ${clientWidth}`,
        ).toBeLessThanOrEqual(clientWidth + 1);

        const escapes = await page.evaluate(scanForEscapes);
        expect(
          escapes,
          `elements escaping the viewport at ${width}px on ${route}:\n${escapes.join('\n')}`,
        ).toEqual([]);
      });
    }
  });
}

test.describe('landscape and short viewports', () => {
  for (const [w, h] of [
    [667, 375],
    [844, 390],
    [932, 430],
  ] as const) {
    test(`${w}x${h} — heroes fit the screen and no overflow`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await suppressInterruptions(page);
      for (const route of ['/oddfest', '/oddference', '/oddspace']) {
        await page.goto(route);
        await page.waitForLoadState('load');
        await page.waitForTimeout(800);

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth, `${route} overflows at ${w}x${h}`).toBeLessThanOrEqual(clientWidth + 1);

        // The hero's own CTA/heading stack has to be reachable without
        // scrolling a full-bleed hero — the fixed portrait min-height used to
        // force these heroes past the height of a landscape screen entirely.
        const heroHeight = await page
          .locator('header.oddfest-hero, header.space-hero')
          .first()
          .evaluate((el) => el.getBoundingClientRect().height);
        expect(
          heroHeight,
          `${route} hero is ${Math.round(heroHeight)}px tall on a ${h}px viewport — taller than the screen`,
        ).toBeLessThanOrEqual(h + 1);
      }
    });
  }
});
