// Makes the published ODDspace rate card operable (2026-09-24): hides the
// lanes you are not in, adds your selection up, and carries it into the
// enquiry form. See VenueRateCalculator.astro's own comment for why every
// price is in the markup already and nothing here may be the only way to
// see one — if this script never runs, the section is still the full rate
// card, just longer.

const root = document.querySelector<HTMLElement>('.vrc');

if (root) {
  const vatRate = Number(root.dataset.vat ?? 0);
  const panels = Array.from(root.querySelectorAll<HTMLElement>('.vrc-panel'));
  const laneInputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="vrc-lane"]'));
  const estimate = root.querySelector<HTMLElement>('.vrc-estimate');
  const figure = root.querySelector<HTMLElement>('.vrc-estimate-figure');
  const vatLine = root.querySelector<HTMLElement>('.vrc-estimate-vat');
  const ctaLink = root.querySelector<HTMLAnchorElement>('.vrc-cta a');
  const ctaHref = root.dataset.ctaHref ?? ctaLink?.getAttribute('href') ?? '';

  // All money here is whole cents (2026-09-28). `total * (1 + 25.5 / 100)` is
  // 125.4999… for €100, which printed €125 (really €125.50) while €500
  // rounded up to €628 (really €627.50): float noise decided the direction.
  // Integer cents times the rate in basis points is exact, so VAT rounds once,
  // half-up, to the cent. Whole euros print without decimals, like the card.
  const toCents = (euros: number) => Math.round(euros * 100);
  const grossBps = Math.round((100 + vatRate) * 100);
  const withVat = (cents: number) => Math.round((cents * grossBps) / 10_000);
  const euro = (cents: number) =>
    `€${(cents / 100).toLocaleString('en-IE', {
      minimumFractionDigits: cents % 100 ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  const currentLane = () => laneInputs.find((i) => i.checked)?.value ?? laneInputs[0]?.value ?? '';
  const panelFor = (lane: string) => panels.find((p) => p.dataset.lane === lane);

  function render() {
    const lane = currentLane();
    for (const panel of panels) panel.hidden = panel.dataset.lane !== lane;

    const panel = panelFor(lane);
    if (!panel || !estimate || !figure || !vatLine) return;

    const rate = panel.querySelector<HTMLInputElement>('input[type="radio"]:checked');
    const addOns = Array.from(
      panel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'),
    );
    const total =
      toCents(Number(rate?.dataset.price ?? 0)) +
      addOns.reduce((sum, a) => sum + toCents(Number(a.dataset.price ?? 0)), 0);

    // A revenue-share rate carries no number of its own — its row says
    // "€0 upfront" and the real money is the door split in the note beside
    // it. Anything added on top of it is still only what is payable upfront,
    // so say that rather than presenting €200 as the price of the evening.
    const isUpfrontOnly = rate?.parentElement
      ?.querySelector('.vrc-row-price')
      ?.textContent?.toLowerCase()
      .includes('upfront');

    figure.textContent =
      total === 0 ? '€0 upfront' : isUpfrontOnly ? `${euro(total)} upfront` : euro(total);
    vatLine.textContent =
      total === 0 ? '' : `+ VAT ${vatRate}% · ${euro(withVat(total))} incl. VAT`;
    estimate.hidden = false;

    // Land in the enquiry form with the choice already made, so the first
    // reply can be about the date rather than about who they are. Both
    // values are read back from a fixed list on the other side
    // (work-enquiry-form.ts), never echoed as free text.
    if (ctaLink && ctaHref) {
      // Resolved against this page, not the site root, so an in-page link
      // (the booking enquiry's "#booking-form") stays on this page.
      const url = new URL(ctaHref, window.location.href);
      url.searchParams.set('lane', lane);
      if (rate?.value) url.searchParams.set('offer', rate.value);
      ctaLink.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
    }
  }

  root.addEventListener('change', render);
  render();
}
