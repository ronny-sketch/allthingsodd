// Playful custom cursor: swaps frames on an interval and follows the real pointer.
// Skipped entirely on touch devices (no real hover cursor to replace).
if (!window.matchMedia('(hover: none)').matches) {
  const img = document.querySelector<HTMLImageElement>('.cursor-img');
  if (img) {
    const frames: string[] = JSON.parse(img.dataset.frames ?? '[]');
    // Tip of the drawn pointer sits ~11.7% in from the left, right at the top edge of
    // the cropped art — these offsets (in px, at the CSS width set on .cursor-img) keep
    // that drawn tip glued to the real mouse position instead of the image's own corner.
    const TIP_X = 0.1173;
    const TIP_Y = 0.0054;
    const DISPLAY_W = 34;
    const DISPLAY_H = 38.9;

    if (frames.length) img.src = frames[0];
    document.body.classList.add('cursor-ready');

    // Native text-entry controls need their own real cursor (I-beam over
    // text, arrow over a <select>) to actually read as editable/choosable —
    // the drawn cursor image is hidden whenever the real pointer is over one
    // of these, so global.css's `cursor: auto` on them is what the visitor
    // actually sees, not this image drawn on top of it (2026-08-31 final
    // implementation pass).
    const NATIVE_CURSOR_SELECTOR = 'input, textarea, select';
    window.addEventListener('mousemove', (e) => {
      img.style.transform = `translate(${(e.clientX - TIP_X * DISPLAY_W).toFixed(1)}px,${(e.clientY - TIP_Y * DISPLAY_H).toFixed(1)}px)`;
      const overNativeControl = (e.target as Element | null)?.closest?.(NATIVE_CURSOR_SELECTOR);
      img.style.opacity = overNativeControl ? '0' : '';
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && frames.length) {
      let i = 0;
      setInterval(() => {
        i = (i + 1) % frames.length;
        img.src = frames[i];
      }, 160);
    }
  }
}

export {};
