// Loads Stripe.js from js.stripe.com on demand — never bundled, never
// sitewide (PCI compliance requires loading it directly from Stripe's own
// CDN, not through our own bundler — see docs.stripe.com/security/guide).
// Only ever called from /tickets/checkout.
import { STRIPE_JS_URL } from './config';

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeInstance;
  }
}

export interface EmbeddedCheckout {
  mount(selector: string): void;
  unmount(): void;
  destroy(): void;
}

export interface StripeInstance {
  // Confirmed against docs.stripe.com/checkout/embedded/quickstart's
  // vanilla-JS "Full embedded page" sample 2026-08-31 — this is the real
  // method name for ui_mode: 'embedded_page' outside a React app.
  createEmbeddedCheckoutPage: (options: {
    fetchClientSecret: () => Promise<string>;
  }) => Promise<EmbeddedCheckout>;
}

let loadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = STRIPE_JS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Stripe.js'));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export async function loadStripe(publishableKey: string): Promise<StripeInstance> {
  await loadScript();
  if (!window.Stripe) throw new Error('Stripe.js loaded but window.Stripe is missing');
  return window.Stripe(publishableKey);
}
