/*
  Scroll-triggered fade-up for any element carrying `.reveal` — see
  styles/motion.css for the CSS half.

  Rebuilt 2026-09-02 (mobile experience pass). The previous version was a bare
  `new IntersectionObserver(cb, { threshold: 0.15 })`, which had two
  independently-reproduced failure modes on mobile:

  1. **Tall targets could never reach the threshold.** IntersectionObserver's
     ratio is intersectionArea / *target* area, so a target taller than
     viewport ÷ 0.15 can never be 15% visible at once and its callback never
     fires at all — the content stays at `opacity: 0` permanently. Measured,
     not theorised: scrolling every route to its true end across the mobile
     viewport matrix left exactly three `.reveal` elements never revealed,
     two of them this failure outright — `/oddference`'s `.person-grid`
     (4032px tall against a 430px landscape viewport: maximum attainable
     ratio 0.107) and `/oddspace`'s `.space-showcase` (2637px, ratio 0.163 —
     a scroll window a few dozen pixels wide, which a normal flick skips).
     The third, a 54px `.section-head` on the homepage, is the same fragility
     from the other end: a small target whose brief window fell between two
     observations.
  2. **JS was load-bearing for visibility.** motion.css set `.reveal { opacity:
     0 }` unconditionally under `prefers-reduced-motion: no-preference`, so any
     failure to run this module — a script error, a blocked/failed asset, an
     old browser without IntersectionObserver — left most of the site's content
     permanently invisible rather than merely un-animated.

  The fix is progressive enhancement in both directions:

  - The hidden-until-revealed state is now gated behind `html.reveal-js` (see
    motion.css), which this module adds itself. Content is visible by default;
    the animation opts in only once the script that can undo it is actually
    running.
  - Triggering uses `threshold: 0` plus a negative bottom `rootMargin` instead
    of an area ratio, so "has this entered the lower part of the viewport"
    is the question asked — which is independent of how tall the target is.
  - A `load`-time sweep plus a hard timeout backstop reveal anything the
    observer hasn't, so no element can stay invisible indefinitely under any
    circumstance.
*/

const REVEAL_CLASS = 'in';

function revealNow(el: Element) {
  el.classList.add(REVEAL_CLASS);
}

function revealAll() {
  document.querySelectorAll(`.reveal:not(.${REVEAL_CLASS})`).forEach(revealNow);
}

// prefers-reduced-motion is handled entirely in CSS (motion.css keeps
// `.reveal` visible and static under `reduce`), but there's no reason to
// enable the hidden state or run an observer at all in that case.
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReduced || !('IntersectionObserver' in window)) {
  // The inline head script in Layout.astro never added `html.reveal-js` in
  // this case, so the CSS is already hiding nothing and every `.reveal`
  // element sits at its final visible state. Adding `.in` anyway keeps the
  // DOM's own state honest for any CSS or test that reads it.
  document.documentElement.classList.remove('reveal-js');
  revealAll();
} else {
  document.documentElement.classList.add('reveal-js');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        revealNow(entry.target);
        observer.unobserve(entry.target);
      }
    },
    {
      // threshold 0 — fire as soon as *any* part of the target crosses the
      // root box, so a section's own height never decides whether it can
      // appear (see failure mode 1 above).
      threshold: 0,
      // Read as one line rather than a box: "has this element's top edge
      // reached 90% of the way down the viewport yet?"
      //
      // The -10% bottom is the trigger line itself — an element reveals once
      // it is genuinely on screen rather than at the very bottom pixel, which
      // is what makes it read as a deliberate entrance.
      //
      // The enormous top margin is what makes the condition *monotonic*.
      // With a bounded top edge the root is a band, and anything that moves
      // from below the band to above it between two observations is never
      // seen intersecting, so it stays invisible forever — the same class of
      // miss as failure mode 1, reachable by a fast flick or by a lazily
      // loaded image above a section shifting it past the band after the
      // observer has already sampled that position. Unbounded upward, an
      // element that has crossed the line is intersecting from then on, so
      // no sampling gap, layout shift or scroll speed can skip it.
      rootMargin: '999999px 0px -10% 0px',
    },
  );

  const observe = () => {
    document
      .querySelectorAll(`.reveal:not(.${REVEAL_CLASS})`)
      .forEach((el) => observer.observe(el));
  };
  observe();

  // Disarms the inline head script's 4s "this module never ran" backstop (see
  // Layout.astro). Set *after* the observer is wired up, not before: if
  // anything above threw, the flag stays absent, that backstop fires, drops
  // `html.reveal-js`, and the page renders as plain visible content.
  document.documentElement.setAttribute('data-reveal-ready', '');

  // Safety nets. None of these are the normal path — they exist so that a
  // stalled observer, a late layout shift, or a target that is somehow never
  // intersected can't leave real content invisible (failure mode 2).
  //
  // `load` covers elements whose geometry only settles once images/fonts have
  // sized their containers; the timeout is the unconditional backstop.
  window.addEventListener('load', observe, { once: true });
  window.setTimeout(revealAll, 6000);

  // A page restored from the back/forward cache doesn't re-run this module,
  // and Safari in particular can restore it mid-scroll with observers idle.
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) revealAll();
  });
}

export {};
