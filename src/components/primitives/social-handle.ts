// One source of truth for "which account is this icon actually going to?"
//
// Extracted from media.astro on 2026-09-04 so the footer, the fullscreen menu
// and the contact page can use it too. Until then those three rendered a bare
// `aria-label="Instagram"` on an icon pointing at `@oddfest.fi` — which, on a
// site whose own name is now All Things ODD, quietly presented an ODDfest
// product channel as the umbrella account. Naming the real handle is the
// honest version, and it costs nothing: the handle is derived from the link
// itself, so it can never drift from where the icon actually goes.
//
// (The underlying question — whether ODD wants masterbrand social accounts at
// all, or keeps using the ODDfest ones — is a human decision, recorded as B14
// in docs/IDENTITY_LAUNCH_MATRIX_2026-09-04.md. This does not pre-empt it; it
// just stops the current arrangement from claiming to be something it isn't.)

/**
 * `https://www.instagram.com/oddfest.fi` -> `@oddfest.fi`.
 * Returns null where the link has no meaningful handle (a Discord invite is a
 * random code, not an account name).
 */
export function deriveHandle(platform: string, href: string): string | null {
  if (platform === 'Discord') return null;
  try {
    const url = new URL(href);
    const segment = url.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .pop();
    return segment ? `@${segment}` : null;
  } catch {
    return null;
  }
}

/**
 * The accessible name for an icon-only social link: the platform plus the
 * account it opens, so nothing has to be inferred from a glyph.
 */
export function socialLinkLabel(platform: string, href: string): string {
  const handle = deriveHandle(platform, href);
  return handle ? `${platform} — ${handle}` : platform;
}
