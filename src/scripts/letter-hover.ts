// letter-hover: cycles the archive accent palette per letter on hover. The real
// sentence stays on the element as an aria-label; letter spans are aria-hidden so
// screen readers get the sentence once, not one node per character.
//
// Letters are grouped into a per-word wrapper (`white-space: nowrap`, see
// OpeningLine.astro) rather than sitting as siblings directly in `wrap` —
// adjacent `display: inline-block` boxes (needed for the per-letter hover
// transform) are each an atomic inline-level box, so without a word grouping
// the browser treats every letter-to-letter boundary as a valid line-break
// point, not just the real word boundaries. Caught via real (longer) heading
// copy at mobile width: "EXPERTISE" was wrapping as "EXPERTI/SE".
const el = document.querySelector<HTMLElement>('.opening-line');
if (el) {
  const text = el.dataset.text ?? el.textContent ?? '';
  const palette = ['#5081b3', '#ae6855', '#ce8942', '#8224d4', '#1436c4', '#50241a'];
  el.setAttribute('aria-label', text);
  const wrap = document.createElement('span');
  wrap.setAttribute('aria-hidden', 'true');
  let li = 0;
  const words = text.split(' ');
  words.forEach((word, wi) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    Array.from(word).forEach((ch) => {
      const span = document.createElement('span');
      span.className = 'letter';
      span.textContent = ch;
      span.style.setProperty('--lc', palette[li % palette.length]);
      li++;
      wordSpan.appendChild(span);
    });
    wrap.appendChild(wordSpan);
    if (wi < words.length - 1) wrap.appendChild(document.createTextNode(' '));
  });
  el.textContent = '';
  el.appendChild(wrap);
}

export {};
