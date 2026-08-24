// Living, warping Forta type — ported from the ODDfest marketing site's
// WarpingText component (oddfest-front-main/src/components/WarpingText).
// Same math (per-word oscillating blur + a canvas-painted, cursor-biased
// displacement map feeding an SVG feDisplacementMap), adapted to this
// codebase's conventions:
//   - reads its font-size from the rendered heading (whatever type-scale
//     class the caller passed in) instead of a container-width ratio, so it
//     stays on the fluid clamp() type scale like everything else on the site;
//   - keeps the real text as the accessible, SSR'd node and layers a
//     client-built, aria-hidden visual replacement on top — never owns the
//     only copy of the words;
//   - `prefers-reduced-motion: reduce` no-ops the whole module. The plain
//     heading already in the markup is what renders — nothing to pause, per
//     the reduced-motion rule in CLAUDE.md.
const SVGNS = 'http://www.w3.org/2000/svg';

interface Word {
  text: string;
  lineIndex: number;
}

function splitWords(text: string): Word[] {
  const words: Word[] = [];
  text.split('\n').forEach((line, lineIndex) => {
    line.split(' ').forEach((word) => {
      if (word.indexOf('-') !== -1) {
        const parts = word.split('-');
        parts.forEach((part, j) => {
          words.push({ text: part + (j < parts.length - 1 ? '-' : ' '), lineIndex });
        });
      } else {
        words.push({ text: word + ' ', lineIndex });
      }
    });
  });
  return words;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, tag) as SVGElementTagNameMap[K];
  for (const key in attrs) node.setAttribute(key, String(attrs[key]));
  return node;
}

function initInstance(container: HTMLElement) {
  const fallbackOrNull = container.querySelector<HTMLElement>('[data-warping-fallback]');
  if (!fallbackOrNull) return;
  // Reassigning the narrowed value gives this a real non-null static type —
  // narrowing itself doesn't survive into the closures below (fontSizePx,
  // remeasure, etc. all run later, via rAF/observers), but a fresh const's
  // inferred type does.
  const fallback: HTMLElement = fallbackOrNull;

  const text = fallback.textContent ?? '';
  const blurStrength = parseFloat(container.dataset.blur ?? '1');
  const displacementStrength = parseFloat(container.dataset.displacement ?? '1');
  const distort = container.dataset.distort !== '0';

  const measure = document.createElement('div');
  measure.className = 'warping-measure';
  const canvas = document.createElement('canvas');
  canvas.className = 'warping-canvas';
  const ctx = canvas.getContext('2d');
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'warping-svg');
  svg.setAttribute('aria-hidden', 'true');
  if (!ctx) return;

  fallback.after(measure, canvas, svg);
  fallback.classList.add('warping-fallback--hidden');

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let boxWidth = 0;
  let boxHeight = 0;
  let words: Word[] = [];
  let wordEls: HTMLElement[] = [];
  let boxes: { text: string; x: number; y: number }[] = [];
  let wordFilters: SVGFEGaussianBlurElement[] = [];
  let dispFeImage: SVGFEImageElement | null = null;
  let dispFeDisplacement: SVGFEDisplacementMapElement | null = null;

  let time = 0;
  let amount = distort ? 1 : 0;
  let rawMouse: [number, number] = [window.innerWidth / 2, window.innerHeight / 2];
  let smoothMouse: [number, number] = [...rawMouse];
  let intersecting = true;
  let raf: number | null = null;

  function fontSizePx(): number {
    return parseFloat(getComputedStyle(fallback).fontSize) || 16;
  }

  function rebuildMeasure() {
    words = splitWords(text);
    measure.innerHTML = '';
    const lineCount = words.reduce((max, w) => Math.max(max, w.lineIndex), 0);
    const lines: HTMLElement[] = [];
    for (let i = 0; i <= lineCount; i++) {
      const line = document.createElement('span');
      line.className = 'warping-measure-line';
      measure.appendChild(line);
      lines.push(line);
    }
    wordEls = words.map((w) => {
      const span = document.createElement('span');
      span.textContent = w.text;
      lines[w.lineIndex].appendChild(span);
      return span;
    });
  }

  function remeasure() {
    // .warping-measure is a sibling of the fallback heading, not a descendant,
    // so it doesn't inherit the type-scale class's font — copy the computed
    // values across each time (clamp() font-size changes with viewport width).
    const computed = getComputedStyle(fallback);
    measure.style.font = computed.font;
    measure.style.letterSpacing = computed.letterSpacing;
    rebuildMeasure();
    const rect = measure.getBoundingClientRect();
    boxWidth = rect.width;
    boxHeight = rect.height;
    boxes = wordEls.map((span, i) => ({
      text: words[i].text,
      x: span.offsetLeft,
      y: span.offsetTop,
    }));
    buildSvg();
  }

  function buildSvg() {
    svg.innerHTML = '';
    wordFilters = [];

    // The SVG is a sibling of the fallback heading, not a descendant, so its
    // <text> children need the font copied across explicitly (same reason
    // as .warping-measure above) or they'd render at the browser default.
    const computed = getComputedStyle(fallback);
    svg.style.font = computed.font;
    svg.style.letterSpacing = computed.letterSpacing;

    const fsr = fontSizePx();
    const padding = fsr * 0.5;
    const paddedWidth = boxWidth + padding * 2;
    const paddedHeight = boxHeight + padding * 2;
    if (paddedWidth <= 0 || paddedHeight <= 0) return;

    canvas.width = paddedWidth * dpr;
    canvas.height = paddedHeight * dpr;
    canvas.style.width = `${paddedWidth}px`;
    canvas.style.height = `${paddedHeight}px`;
    canvas.style.margin = `${-padding}px`;

    svg.setAttribute('width', String(paddedWidth));
    svg.setAttribute('height', String(paddedHeight));
    svg.setAttribute('viewBox', `0 0 ${paddedWidth} ${paddedHeight}`);
    svg.style.width = `${paddedWidth}px`;
    svg.style.height = `${paddedHeight}px`;
    svg.style.margin = `${-padding}px`;

    const defs = svgEl('defs', {});
    svg.appendChild(defs);

    boxes.forEach((_, i) => {
      const filter = svgEl('filter', { id: `${container.id}-blur-${i}` });
      const blur = svgEl('feGaussianBlur', { stdDeviation: 0, in: 'SourceAlpha' });
      const colorMatrix = svgEl('feColorMatrix', {
        type: 'matrix',
        values: '1 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 50 -10',
      });
      filter.append(blur, colorMatrix);
      defs.appendChild(filter);
      wordFilters.push(blur);
    });

    const dispFilter = svgEl('filter', { id: `${container.id}-displacement` });
    dispFeImage = svgEl('feImage', {
      result: 'displacementMap',
      x: 0,
      y: 0,
      width: paddedWidth,
      height: paddedHeight,
      preserveAspectRatio: 'none',
    });
    dispFeDisplacement = svgEl('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'displacementMap',
      scale: 0,
      xChannelSelector: 'R',
      yChannelSelector: 'G',
    });
    dispFilter.append(dispFeImage, dispFeDisplacement);
    defs.appendChild(dispFilter);

    const g = svgEl('g', { filter: `url(#${container.id}-displacement)` });
    g.appendChild(
      svgEl('rect', { x: 0, y: 0, width: paddedWidth, height: paddedHeight, fill: 'transparent' }),
    );

    boxes.forEach((box, i) => {
      const wrap = svgEl('g', { filter: `url(#${container.id}-blur-${i})` });
      const textEl = svgEl('text', {
        x: box.x + padding,
        y: box.y + padding + fsr * 0.9,
        fill: 'black',
        'font-weight': 'normal',
      });
      textEl.textContent = box.text;
      wrap.appendChild(textEl);
      g.appendChild(wrap);
    });

    svg.appendChild(g);
  }

  function drawNoise() {
    const fsr = fontSizePx();
    const padding = fsr * 0.5;
    const paddedWidth = boxWidth + padding * 2;
    const paddedHeight = boxHeight + padding * 2;
    if (paddedWidth <= 0 || paddedHeight <= 0 || !ctx) return;

    const normalisedMouse = {
      x: smoothMouse[0] / window.innerWidth - 0.5,
      y: smoothMouse[1] / window.innerHeight - 0.5,
    };
    const offset = boxWidth * 0.5;
    const posOffset = { x: normalisedMouse.x * offset, y: normalisedMouse.y * offset };

    const radiusX1 = boxWidth * 0.4;
    const radiusY1 = boxHeight * 0.4;
    const radiusX3 = boxWidth * 0.2;
    const radiusY3 = boxHeight * 0.2;

    const speed1 = time * 0.75;
    const speed2 = time * 0.75 + 2.09;
    const speed3 = time * 0.75 + 4.18;

    const rx1 = Math.cos(speed1) * radiusX1 + posOffset.x;
    const ry1 = Math.sin(speed1) * radiusY1 + posOffset.y;
    const rx2 = Math.cos(speed2) * radiusX1 - posOffset.x;
    const ry2 = Math.sin(speed2) * radiusY1 - posOffset.y;
    const rx3 = Math.cos(speed3) * radiusX3 + posOffset.x;
    const ry3 = Math.sin(speed3) * radiusY3 + posOffset.y;

    const cw = paddedWidth * dpr;
    const ch = paddedHeight * dpr;
    const x1 = cw / 2 + rx1 * dpr;
    const y1 = ch / 2 + ry1 * dpr;
    const x2 = cw / 2 + rx2 * dpr;
    const y2 = ch / 2 + ry2 * dpr;
    const x3 = cw / 2 + rx3 * dpr;
    const y3 = ch / 2 + ry3 * dpr;

    const smoothedAmount = Math.cos(amount * Math.PI + Math.PI) * 0.5 + 0.5;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgb(127, 127, 127)';
    ctx.fillRect(0, 0, cw, ch);

    const g1 = ctx.createRadialGradient(x1, y1, 10 * dpr, x1, y1, paddedWidth * 0.5 * dpr);
    g1.addColorStop(0, 'rgba(255,255,255,1)');
    g1.addColorStop(1, 'rgba(127,127,127,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, cw, ch);

    const g2 = ctx.createRadialGradient(x2, y2, 10 * dpr, x2, y2, paddedWidth * 0.5 * dpr);
    g2.addColorStop(0, 'rgba(255,255,255,1)');
    g2.addColorStop(1, 'rgba(127,127,127,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, cw, ch);

    const g3 = ctx.createRadialGradient(x3, y3, 10 * dpr, x3, y3, paddedWidth * 0.3 * dpr);
    g3.addColorStop(0, 'rgba(0,0,0,1)');
    g3.addColorStop(1, 'rgba(127,127,127,0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = `rgba(127,127,127,${1 - smoothedAmount})`;
    ctx.fillRect(0, 0, cw, ch);

    dispFeImage?.setAttribute('href', canvas.toDataURL());
    dispFeDisplacement?.setAttribute('scale', String(boxWidth * 0.04 * displacementStrength));
  }

  function updateWordBlur() {
    const fsr = fontSizePx();
    const smoothedAmount = Math.cos(amount * Math.PI + Math.PI) * 0.5 + 0.5;
    wordFilters.forEach((blur, i) => {
      const varDev = Math.cos(i * Math.PI * 0.5 + time) * 0.5 + 0.5;
      blur.setAttribute(
        'stdDeviation',
        String(varDev * fsr * 0.05 * smoothedAmount * blurStrength),
      );
    });
  }

  function tick() {
    if (!intersecting) {
      raf = null;
      return;
    }
    time += 0.03;
    const step = 0.05;
    const target = distort ? 1 : 0;
    if (amount < target) amount = Math.min(target, amount + step);
    else if (amount > target) amount = Math.max(target, amount - step);

    smoothMouse[0] += (rawMouse[0] - smoothMouse[0]) * 0.075;
    smoothMouse[1] += (rawMouse[1] - smoothMouse[1]) * 0.075;

    drawNoise();
    updateWordBlur();
    raf = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (raf === null) raf = requestAnimationFrame(tick);
  }

  window.addEventListener('mousemove', (e) => {
    rawMouse = [e.clientX, e.clientY];
  });

  const resizeObserver = new ResizeObserver(() => remeasure());
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      intersecting = entries[0]?.isIntersecting ?? true;
      if (intersecting) startLoop();
    },
    { rootMargin: '10% 0px' },
  );
  intersectionObserver.observe(container);

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => remeasure());
  }

  remeasure();
  startLoop();
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  let uid = 0;
  document.querySelectorAll<HTMLElement>('[data-warping-text]').forEach((container) => {
    if (!container.id) container.id = `warping-text-${uid++}`;
    initInstance(container);
  });
}

export {};
