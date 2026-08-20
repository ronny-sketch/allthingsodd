// Autoplaying video is motion — prefers-reduced-motion should suppress it the
// same way it suppresses the mosaic pans and marquees. Rather than just
// pausing (which still leaves a decode/paint race between "not loaded yet"
// and "first frame decoded"), replace the element outright with a plain
// <img> of its poster — no video pipeline at all, so there's nothing left to
// settle asynchronously.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll<HTMLVideoElement>('video[autoplay][poster]').forEach((video) => {
    // .aftermovie-full handles its own reduced-motion case (see Aftermovie.astro)
    // with a different DOM shape — skip it here to avoid fighting that logic.
    if (video.closest('.aftermovie-full')) return;
    const img = document.createElement('img');
    img.src = video.poster;
    img.alt = '';
    img.className = video.className;
    video.replaceWith(img);
  });
}

export {};
