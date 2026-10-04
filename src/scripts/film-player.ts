/*
  The full aftermovies, with sound, only when someone asks for one
  (2026-10-04, VideoAndPictures.astro).

  Each "Watch …" link points straight at the film's .mp4, so without this
  script it still plays, in the browser's own player. With it, the film
  opens in a modal <dialog> on the page instead. Nothing of a film is
  fetched until its link is pressed — the cards only ever load their short
  muted previews (autoplay-video.ts) — and closing the dialog drops the
  source, so a half-watched film stops downloading.

  While a film is open every preview on the page pauses (holdPreviews), so
  the only moving picture is the one being watched.
*/
import { holdPreviews } from './autoplay-video';

const dialog = document.querySelector<HTMLDialogElement>('#film-dialog');
const film = dialog?.querySelector<HTMLVideoElement>('video');

if (dialog && film) {
  let opener: HTMLElement | null = null;

  // Same reason as the booking and event idea dialogs: a modal <dialog> is
  // painted above every z-index, including the drawn cursor's, and the native
  // pointer is hidden site-wide. This dialog has no entrance transform, so
  // the cursor can move in at once.
  const cursorEl = document.querySelector<HTMLElement>('.cursor');
  const cursorHome = cursorEl?.parentElement ?? null;

  document.addEventListener('click', (ev) => {
    const a = (ev.target as Element | null)?.closest<HTMLAnchorElement>('a[data-film]');
    // A modified click still opens the file in a new tab, as a link should.
    if (!a || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    opener = a;
    dialog.setAttribute('aria-label', a.dataset.filmTitle ?? a.textContent?.trim() ?? '');
    film.src = a.href;
    holdPreviews(true);
    dialog.showModal();
    if (cursorEl) dialog.append(cursorEl);
    // Pressed a link, so sound is allowed. If the browser still says no, the
    // controls are right there.
    void film.play().catch(() => {});
  });

  dialog.addEventListener('close', () => {
    film.pause();
    film.removeAttribute('src');
    film.load();
    holdPreviews(false);
    if (cursorEl && cursorHome) cursorHome.append(cursorEl);
    // Safari does not focus a link on click, so the browser's own focus
    // return can land on <body>.
    opener?.focus();
  });

  dialog.querySelector('.film-close')?.addEventListener('click', () => dialog.close());
  // A click on the backdrop (the dialog box itself, outside the frame).
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog) dialog.close();
  });
}
