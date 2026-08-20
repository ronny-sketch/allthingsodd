// letter-hover: cycles the archive accent palette per letter on hover. The real
// sentence stays on the element as an aria-label; letter spans are aria-hidden so
// screen readers get the sentence once, not one node per character.
const el = document.querySelector<HTMLElement>('.opening-line');
if (el) {
  const text = el.dataset.text ?? el.textContent ?? '';
  const palette = ['#5081b3', '#ae6855', '#ce8942', '#8224d4', '#1436c4', '#50241a'];
  el.setAttribute('aria-label', text);
  const wrap = document.createElement('span');
  wrap.setAttribute('aria-hidden', 'true');
  let li = 0;
  text.split('').forEach((ch) => {
    if (ch === ' ') {
      wrap.appendChild(document.createTextNode(' '));
      return;
    }
    const span = document.createElement('span');
    span.className = 'letter';
    span.textContent = ch;
    span.style.setProperty('--lc', palette[li % palette.length]);
    li++;
    wrap.appendChild(span);
  });
  el.textContent = '';
  el.appendChild(wrap);
}

export {};
