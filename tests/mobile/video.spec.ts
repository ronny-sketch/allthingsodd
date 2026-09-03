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
  { route: '/', name: 'homepage aftermovie' },
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
      await page.goto(route);
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
