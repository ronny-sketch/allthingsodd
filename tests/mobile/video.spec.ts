import { test, expect, type Page } from '@playwright/test';
import { suppressInterruptions } from './helpers';

/*
  Video lifecycle — the real component behaviour, not "a <video> element
  exists", which proves nothing about what a visitor actually sees.

  The invariant every assertion here defends is the one src/scripts/
  autoplay-video.ts was written to guarantee: **something real is always on
  screen**. Either the poster is the visible layer, or the video is genuinely
  playing. Never neither, and never a video shown on the strength of an
  intention rather than a decoded frame.

  This matters cross-engine and not just in principle: WebKit's autoplay
  policy refuses more often than Chromium's, so the poster-retention path is
  the *normal* path there rather than an edge case.
*/

const STAGES = [
  { route: '/', name: 'homepage film previews' },
  { route: '/oddfest', name: 'ODDfest hero' },
  { route: '/oddference', name: 'ODDference hero' },
];

interface StageState {
  state: string | null;
  posterVisible: boolean;
  videoVisible: boolean;
  playing: boolean;
  readyState: number;
  currentTime: number;
  errorCode: number | null;
  muted: boolean;
  playsInline: boolean;
}

async function readStage(page: Page): Promise<StageState[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-video-stage]')].map((stage) => {
      const video = stage.querySelector('video') as HTMLVideoElement | null;
      const poster = stage.querySelector<HTMLElement>('[data-video-poster]');
      const vcs = video ? getComputedStyle(video) : null;
      return {
        state: stage.getAttribute('data-video-state'),
        posterVisible: !!poster && parseFloat(getComputedStyle(poster).opacity) > 0.5,
        videoVisible: !!vcs && vcs.visibility !== 'hidden' && parseFloat(vcs.opacity) > 0.5,
        playing: !!video && !video.paused && video.readyState >= 2 && video.currentTime > 0,
        readyState: video?.readyState ?? -1,
        currentTime: video?.currentTime ?? -1,
        errorCode: video?.error?.code ?? null,
        muted: !!video?.muted,
        playsInline: !!video?.playsInline,
      };
    }),
  );
}

async function bringStageIntoView(page: Page) {
  await page.evaluate(() =>
    document.querySelector('[data-video-stage]')?.scrollIntoView({ block: 'center' }),
  );
}

/*
  Playwright's WebKit refuses a muted preview's play() until the page has had
  some input (measured 2026-10-04: the /oddfest hero never played there
  without it, even held back a second), although WebKit's published policy
  lets muted video autoplay. So a test that needs real playback presses a key
  first — Shift does nothing on this site — and holds every preview back
  until it has, and WebKit plays instead of skipping.
*/
async function gotoAfterInput(page: Page, route: string) {
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/*-preview.mp4', async (r) => {
    await held;
    await r.continue();
  });
  // Not 'load': a <video> still fetching may hold the load event back.
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Shift');
  release();
}

for (const { route, name } of STAGES) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await suppressInterruptions(page);
    });

    test('poster is the initial state, before any playback', async ({ page }) => {
      await page.goto(route);
      // Read as early as possible: the poster must already be the rendering,
      // not something restored after a failure.
      const stages = await readStage(page);
      expect(stages.length).toBeGreaterThan(0);
      for (const s of stages) {
        expect(s.state, 'stage should start in the poster state').toBe('poster');
        expect(s.posterVisible, 'poster must be visible at load').toBe(true);
      }
    });

    test('never shows an empty frame — poster or real playback, always', async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('load');
      await bringStageIntoView(page);
      await page.waitForTimeout(5000);

      for (const s of await readStage(page)) {
        expect(
          s.posterVisible || s.playing,
          `nothing trustworthy on screen: state=${s.state} posterVisible=${s.posterVisible} ` +
            `playing=${s.playing} readyState=${s.readyState} t=${s.currentTime} err=${s.errorCode}`,
        ).toBe(true);

        // The specific regression: the video layer promoted over a poster
        // that is gone, while nothing is actually playing.
        if (s.videoVisible && !s.posterVisible) {
          expect(
            s.playing,
            `video is the only visible layer but is not playing (readyState=${s.readyState}, t=${s.currentTime})`,
          ).toBe(true);
        }
      }
    });

    test('a video only becomes visible once it is really playing', async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('load');
      await bringStageIntoView(page);
      await page.waitForTimeout(5000);

      for (const s of await readStage(page)) {
        if (s.state === 'playing') {
          expect(s.playing, 'state=playing must mean decoded and advancing').toBe(true);
          expect(s.readyState).toBeGreaterThanOrEqual(2);
          expect(s.errorCode).toBeNull();
        } else {
          expect(s.videoVisible, 'a non-playing stage must not show its video layer').toBe(false);
        }
      }
    });

    test('inline autoplay attributes survive to runtime', async ({ page }) => {
      // Without both of these iOS refuses inline playback outright and
      // Chromium refuses unmuted autoplay — the two settings the whole
      // approach depends on.
      await page.goto(route);
      await page.waitForLoadState('load');
      for (const s of await readStage(page)) {
        expect(s.muted, 'video must stay muted').toBe(true);
        expect(s.playsInline, 'video must stay playsinline').toBe(true);
      }
    });

    test('playback pauses when the stage leaves the viewport', async ({ page }) => {
      await gotoAfterInput(page, route);
      await page.waitForLoadState('load');
      await bringStageIntoView(page);
      await page.waitForTimeout(5000);

      const before = (await readStage(page))[0];
      test.skip(!before.playing, 'playback never started in this engine — nothing to pause');

      await page.evaluate(() => {
        const stage = document.querySelector('[data-video-stage]') as HTMLElement;
        // Far enough that the 200px load margin can't keep it active.
        window.scrollTo(0, stage.offsetTop + stage.offsetHeight + window.innerHeight * 3);
      });
      await page.waitForTimeout(1500);
      const away = await page.evaluate(
        () => (document.querySelector('[data-video-stage] video') as HTMLVideoElement).paused,
      );
      expect(away, 'offscreen video should be paused').toBe(true);
    });

    test('play() rejection is handled, not thrown', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // Force every play() attempt to reject, the way a strict autoplay
      // policy does.
      await page.addInitScript(() => {
        const proto = HTMLMediaElement.prototype;
        proto.play = function play() {
          return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
        };
      });
      await page.goto(route);
      await page.waitForLoadState('load');
      await bringStageIntoView(page);
      await page.waitForTimeout(4000);

      expect(errors, `uncaught error from a rejected play(): ${errors.join('; ')}`).toEqual([]);
      for (const s of await readStage(page)) {
        expect(s.state, 'a refused autoplay must keep the poster').toBe('poster');
        expect(s.posterVisible).toBe(true);
        expect(s.videoVisible).toBe(false);
      }
      // Nothing is moving, so there is nothing to pause.
      await expect(page.locator('.video-toggle:visible')).toHaveCount(0);
    });

    test('an unloadable video keeps the poster', async ({ page }) => {
      await page.route('**/*.mp4', (r) => r.abort());
      await page.goto(route);
      await page.waitForLoadState('load');
      await bringStageIntoView(page);
      await page.waitForTimeout(4000);

      for (const s of await readStage(page)) {
        expect(s.posterVisible, 'poster must survive a failed video fetch').toBe(true);
        expect(s.videoVisible, 'a video that never loaded must not be shown').toBe(false);
      }
    });
  });
}

/*
  2026-10-04: loading and playing are separate decisions (autoplay-video.ts).
  Each test below failed against the previous single-observer version.
  A test that needs real playback still skips itself when the engine never
  started any (a Chromium without H.264, as on the Linux runners).
*/
test.describe('the lifecycle around playback', () => {
  test.beforeEach(async ({ page }) => {
    await suppressInterruptions(page);
  });

  const hero = (page: Page) =>
    page.evaluate(() => {
      const stage = document.querySelector('.oddfest-hero') as HTMLElement;
      const v = stage.querySelector('video') as HTMLVideoElement;
      return {
        state: stage.dataset.videoState,
        playing: !v.paused,
        src: v.currentSrc,
        reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      };
    });

  test('a preview that finishes loading offscreen does not start playing', async ({ page }) => {
    // Hold the file until the visitor has scrolled past the hero. The old
    // code called play() the moment the load finished, wherever they were.
    // The key press is what lets WebKit play at all (gotoAfterInput), so a
    // wrongly timed play() fails there too rather than being refused.
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route('**/oddfest-2026-preview.mp4', async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/oddfest', { waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Shift');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    release();
    await page.waitForTimeout(3000);
    const s = await hero(page);
    expect(s.src, 'the hero did start loading while it was on screen').toContain(
      'oddfest-2026-preview.mp4',
    );
    expect(s.playing, 'nothing plays while it is offscreen').toBe(false);
  });

  test('a hidden tab pauses the preview and showing it again resumes it', async ({ page }) => {
    await gotoAfterInput(page, '/oddfest');
    await page.waitForTimeout(5000);
    test.skip(!(await hero(page)).playing, 'playback never started in this engine');

    const setHidden = (hidden: boolean) =>
      page.evaluate((h) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await setHidden(true);
    expect((await hero(page)).playing).toBe(false);
    await setHidden(false);
    await expect.poll(async () => (await hero(page)).playing).toBe(true);
  });

  test('reduced motion turned on shows the poster; turned off plays again', async ({ page }) => {
    await gotoAfterInput(page, '/oddfest');
    await page.waitForTimeout(5000);
    test.skip((await hero(page)).state !== 'playing', 'playback never started in this engine');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    // matchMedia itself, in the page: the guard that the change really landed.
    await expect.poll(async () => (await hero(page)).reduce).toBe(true);
    await expect.poll(() => hero(page)).toMatchObject({ state: 'poster', playing: false });

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(async () => (await hero(page)).reduce).toBe(false);
    // The old code left the poster for good here.
    await expect
      .poll(() => hero(page), { timeout: 8000 })
      .toMatchObject({ state: 'playing', playing: true });
  });

  test('a page opened under reduced motion loads its preview once that is switched off', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/oddfest');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    expect((await hero(page)).src, 'nothing is fetched under reduced motion').toBe('');

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect.poll(async () => (await hero(page)).src).toContain('oddfest-2026-preview.mp4');
  });

  test('the pause button stops a preview, and it stays stopped', async ({ page }) => {
    await gotoAfterInput(page, '/');
    await bringStageIntoView(page);
    await page.waitForTimeout(5000);
    const first = () =>
      page.evaluate(
        () => !(document.querySelector('[data-video-stage] video') as HTMLVideoElement).paused,
      );
    test.skip(!(await first()), 'playback never started in this engine');

    const toggle = page.locator('[data-video-stage] .video-toggle').first();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', /^Pause preview of ODDfest 2026/);
    await toggle.click();
    expect(await first()).toBe(false);
    await expect(toggle).toHaveAttribute('aria-label', /^Play preview of ODDfest 2026/);
    // The button sits over a card that is one big link: pressing it must not
    // also open the film.
    await expect(page.locator('#film-dialog')).not.toHaveAttribute('open', '');

    // Off screen and back is not a reason to start again.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await bringStageIntoView(page);
    await page.waitForTimeout(1500);
    expect(await first(), 'a paused preview stays paused').toBe(false);

    await toggle.click();
    await expect.poll(first).toBe(true);
  });
});
