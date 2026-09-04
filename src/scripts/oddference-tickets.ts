// ODDference ticket tiers, resolved from the ticket backend at runtime.
//
// Why this exists: the /oddference marketing page and the /tickets storefront
// were two independent descriptions of the same three ticket types, and they
// had already drifted — on 2026-09-03 `oddference.json` advertised Blind Bird
// at EUR 300 while GET /api/tickets/catalog (the price Stripe actually
// charges) said EUR 250. Nothing in the build or the test suite could see
// that, because nothing compared them. The copywriting master is explicit
// that price, sale window, availability, benefits and active/inactive state
// are backend-owned; this makes that literally true on the marketing page
// too, instead of asking an editor to remember.
//
// Same boundary discipline as everything else that talks to Growth OS (see
// AGENTS.md): this calls the documented route by URL and shape, imports no
// backend code, and never lets a browser-side price reach checkout — the
// storefront and the Worker resolve that themselves.
//
// Progressive enhancement, deliberately: the server-rendered card already
// carries a truthful price/status (kept in sync in content), so a blocked
// fetch, an offline visitor or a crawler sees a complete, honest ticket
// section rather than a spinner. This only ever *corrects* it.
import { fetchCatalog, type CatalogTicketType } from './tickets/api';
import { formatMinor } from './tickets/money';
import { EVENT_SLUG } from './tickets/config';

const STATUS_LABEL: Record<CatalogTicketType['status'], string> = {
  active: 'On sale now',
  upcoming: 'Not on sale yet',
  sold_out: 'Sold out',
  sale_ended: 'Sale closed',
  hidden: '',
};

function setText(el: Element | null, value: string): void {
  if (el && el.textContent !== value) el.textContent = value;
}

function applyTier(card: HTMLElement, tt: CatalogTicketType): void {
  const isActive = tt.status === 'active' && tt.availableToPurchase > 0;

  setText(card.querySelector('.pricing-price'), formatMinor(tt.displayPriceMinor, tt.currency));

  const status = card.querySelector<HTMLElement>('.pricing-status');
  if (status) {
    const label =
      tt.status === 'active' && !isActive ? STATUS_LABEL.sold_out : STATUS_LABEL[tt.status];
    setText(status, label);
    status.hidden = label === '';
  }

  // Benefits are backend-owned too — an inclusion added to a ticket type in
  // D1 should not need a second edit here to become true on the page.
  const benefits = card.querySelector('.pricing-benefits');
  if (benefits && tt.benefits.length > 0) {
    benefits.replaceChildren(
      ...tt.benefits.map((b) => {
        const li = document.createElement('li');
        li.textContent = b;
        return li;
      }),
    );
  }

  // The active tier gets the conversion emphasis (solid CTA + the badge);
  // every other tier stays a quiet outline link to the storefront. Pill's
  // own classes are reused rather than restyled — see PricingGrid.astro.
  const cta = card.querySelector<HTMLAnchorElement>('a.pill');
  if (cta) {
    setText(cta, isActive ? `Buy ${tt.name}` : 'See tickets');
    cta.classList.toggle('pill-solid', isActive);
    cta.classList.toggle('pill-outline', !isActive);
  }

  card.classList.toggle('is-recommended', isActive);
  const badge = card.querySelector<HTMLElement>('.pricing-badge');
  if (badge) badge.hidden = !isActive;
}

async function sync(cards: HTMLElement[]): Promise<void> {
  const catalog = await fetchCatalog(EVENT_SLUG);
  // Null covers every failure the fetch wrapper swallows (offline, CORS,
  // 5xx, malformed JSON). Leaving the server-rendered card exactly as it is
  // is the correct fallback — it is not a placeholder.
  if (!catalog) return;

  const bySlug = new Map(catalog.ticketTypes.map((tt) => [tt.slug, tt]));
  for (const card of cards) {
    const tt = bySlug.get(card.dataset.ticketSlug ?? '');
    // A tier the catalog no longer publishes (or has hidden) is removed
    // rather than left advertising a price nothing will honour.
    if (!tt || tt.status === 'hidden') {
      card.remove();
      continue;
    }
    applyTier(card, tt);
  }
}

function start(): void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-ticket-slug]'));
  if (cards.length === 0) return;

  // Deferred until the ticket block is near the viewport, for the same
  // reason the ODDspace gallery is: this section is a long way below the
  // fold, the request is cross-origin, and a visitor who never reaches it
  // should not pay for it. It also keeps the fetch off the critical path
  // entirely — by the time anyone is reading prices, it has long since
  // resolved.
  const run = () => {
    // Belt and braces on top of fetchCatalog's own try/catch: nothing in
    // this module may ever reach the page as an unhandled rejection. WebKit
    // reports a refused cross-origin request as a page-level error, which
    // would otherwise surface on an unrelated page-error assertion.
    sync(cards).catch(() => {});
  };

  if (!('IntersectionObserver' in window)) {
    run();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      run();
    },
    { rootMargin: '400px 0px' },
  );
  for (const card of cards) observer.observe(card);
}

start();
