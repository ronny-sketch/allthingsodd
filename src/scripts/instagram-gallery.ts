// ODDspace Instagram gallery — fetches the Behold JSON feed and fills the
// tiles rendered by InstagramGallery.astro.
//
// Design constraints this implements (all of them load-bearing, none
// cosmetic):
//   - Below the fold, so it initialises near the viewport, not on load. An
//     unseen section costs zero requests.
//   - Zero layout shift: the tiles already exist at their final size with a
//     reserved aspect ratio; this only puts images inside them.
//   - Reels show poster media. No video element, no autoplay, ever.
//   - A provider outage degrades to a quiet "Follow @oddspace.co" line, not
//     a collapsed section, an empty grid or a console error.
//   - No storage, no analytics, no third-party script. The only network
//     traffic is one GET to feeds.behold.so plus the images it names.
import {
  BEHOLD_FEED_ENDPOINT,
  ODDSPACE_INSTAGRAM_POST_COUNT,
  ODDSPACE_INSTAGRAM_HANDLE,
} from './oddspace-instagram-config';

interface BeholdSize {
  mediaUrl: string;
  width: number;
  height: number;
}
interface BeholdPost {
  id: string;
  permalink: string;
  timestamp?: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  isReel?: boolean;
  altText?: string;
  prunedCaption?: string;
  caption?: string;
  sizes?: { small?: BeholdSize; medium?: BeholdSize; large?: BeholdSize; full?: BeholdSize };
  colorPalette?: { dominant?: string };
}
interface BeholdFeed {
  posts?: BeholdPost[];
  showBranding?: boolean;
}

const root = document.querySelector<HTMLElement>('[data-instagram-gallery]');

function fail(reason: string): void {
  if (!root) return;
  // Not console.error: a third party being down is not this site's bug, and
  // the visual suite's per-route console-error check would (correctly) go
  // red on something no deploy can fix. The DOM state is the real signal.
  root.dataset.state = 'unavailable';
  root.setAttribute('data-instagram-error', reason);
}

function captionFor(post: BeholdPost): string {
  const text = (post.altText || post.prunedCaption || post.caption || '').trim();
  if (!text) return `Instagram post from @${ODDSPACE_INSTAGRAM_HANDLE}`;
  const firstLine = text.split('\n')[0].trim();
  return firstLine.length > 140 ? `${firstLine.slice(0, 139).trimEnd()}…` : firstLine;
}

function fillTile(tile: HTMLAnchorElement, post: BeholdPost): boolean {
  const sizes = post.sizes ?? {};
  const small = sizes.small;
  const medium = sizes.medium;
  const large = sizes.large;
  const best = large ?? medium ?? small;
  if (!best?.mediaUrl) return false;

  const label = captionFor(post);
  tile.href = post.permalink;
  tile.setAttribute('aria-label', label);

  const img = document.createElement('img');
  img.src = best.mediaUrl;
  const srcset = [small, medium, large]
    .filter((s): s is BeholdSize => Boolean(s?.mediaUrl))
    .map((s) => `${s.mediaUrl} ${s.width}w`)
    .join(', ');
  if (srcset) {
    img.srcset = srcset;
    // The lead tile is roughly twice the width of the five that surround it;
    // below the tablet breakpoint every tile is half the viewport.
    img.sizes = '(max-width: 760px) 50vw, (max-width: 1100px) 33vw, 380px';
  }
  img.width = best.width;
  img.height = best.height;
  img.loading = 'lazy';
  img.decoding = 'async';
  // Decorative relative to the link: the <a> already carries the accessible
  // name, so a duplicated alt would make a screen reader read it twice.
  img.alt = '';

  const media = tile.querySelector('.ig-tile-media');
  if (!media) return false;
  media.replaceChildren(img);

  const dominant = post.colorPalette?.dominant;
  if (dominant && /^\d{1,3},\d{1,3},\d{1,3}$/.test(dominant)) {
    tile.style.setProperty('--ig-tile-bg', `rgb(${dominant})`);
  }

  const badge = tile.querySelector<HTMLElement>('.ig-tile-badge');
  if (badge) {
    const isVideo = post.isReel === true || post.mediaType === 'VIDEO';
    const isAlbum = post.mediaType === 'CAROUSEL_ALBUM';
    if (isVideo || isAlbum) {
      badge.hidden = false;
      badge.textContent = isVideo ? '▶' : '▣';
      badge.setAttribute('aria-hidden', 'true');
    }
  }
  return true;
}

async function load(): Promise<void> {
  if (!root) return;
  const feedId = root.dataset.feedId;
  if (!feedId) return fail('not-configured');

  let feed: BeholdFeed;
  try {
    const res = await fetch(`${BEHOLD_FEED_ENDPOINT}/${encodeURIComponent(feedId)}`);
    if (!res.ok) return fail(`http-${res.status}`);
    feed = (await res.json()) as BeholdFeed;
  } catch {
    return fail('network');
  }

  const posts = (feed.posts ?? []).slice(0, ODDSPACE_INSTAGRAM_POST_COUNT);
  if (posts.length === 0) return fail('empty');

  const tiles = Array.from(root.querySelectorAll<HTMLAnchorElement>('.ig-tile'));
  let filled = 0;
  tiles.forEach((tile, i) => {
    const post = posts[i];
    // A tile with no post behind it (a feed returning fewer than six, or a
    // post with no usable media) is removed rather than left as a grey
    // square — the wall reflows to whatever is real.
    if (post && fillTile(tile, post)) filled += 1;
    else tile.remove();
  });

  if (filled === 0) return fail('no-media');

  // Drives the gallery-wall rhythm: the 2x2 lead tile only tiles cleanly at
  // exactly six. See InstagramGallery.astro's grid comment.
  root.dataset.count = String(filled);

  // Free-plan feeds ask for an attribution; paid ones return false. Honour
  // whatever the feed itself says rather than deciding for the account.
  if (feed.showBranding) {
    const credit = root.querySelector<HTMLElement>('.ig-credit');
    if (credit) credit.hidden = false;
  }

  root.dataset.state = 'loaded';
}

function start(): void {
  if (!root) return;
  // Flips the grid on. Until this runs there is deliberately nothing to see
  // but the fallback line — see InstagramGallery.astro's .ig-grid comment.
  root.dataset.state = 'loading';
  if (!('IntersectionObserver' in window)) {
    void load();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      void load();
    },
    // Begins the request roughly one viewport early, so the images are
    // usually decoded by the time the section is actually on screen.
    { rootMargin: '400px 0px' },
  );
  observer.observe(root);
}

start();
