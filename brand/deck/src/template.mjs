// all-things-odd-template.pptx — 21 archetypes.
//
// The content is real ODD copy (allthingsodd.co) so the template can be used
// as-is and so nobody has to imagine what a slide looks like full. Every slide
// carries speaker notes: when to reach for it, and the rules it obeys.

import {
  ASPECT,
  BOTTOM,
  CONTENT,
  HAIR,
  HALF_W,
  M,
  RIGHT,
  SLIDE,
  T,
  band,
  cells,
  col,
  eyebrow,
  figures,
  ink,
  lines,
  lockup,
  meta,
  paper,
  partnerLogo,
  photo,
  pill,
  pillWidth,
  premise,
  rail,
  rule,
  scrim,
  scrimFade,
  sectionHead,
  span,
  text,
  vrule,
} from './odd.mjs';

const EYEBROW_Y = 0.95; // under the meta line, for left-aligned slides
const MOSAIC = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

/** The cover mosaic: twelve archive photographs, joined by hairline gaps. */
function mosaic(s, { transparency = 42 } = {}) {
  const cw = (SLIDE.w - 3 * HAIR) / 4;
  const ch = (SLIDE.h - 2 * HAIR) / 3;
  MOSAIC.forEach((n, i) => {
    photo(s, `mosaic-${n}.jpg`, {
      x: (i % 4) * (cw + HAIR),
      y: Math.floor(i / 4) * (ch + HAIR),
      w: cw,
      h: ch,
    });
  });
  scrim(s, { transparency });
}

export function templateDeck(pres) {
  /* 01 — Cover -------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink Full' });
    mosaic(s);
    lockup(s, 'odd-mark', { cx: SLIDE.w / 2, y: 2.28, h: 1.15 });
    text(
      s,
      'ODD exists to build better conditions for creative work — and to bring creative and cultural fields closer to business and wider society.',
      {
        x: (SLIDE.w - 9.5) / 2,
        y: 3.85,
        w: 9.5,
        h: lines(4, T.heading),
        ...T.heading,
        color: ink.figure,
        align: 'center',
      },
    );
    eyebrow(s, 'HELSINKI · NEW NORDIC WAY RF', {
      x: M.l,
      y: 6.72,
      w: span(6),
      g: ink,
      color: ink.strong,
    });
    eyebrow(s, 'ALLTHINGSODD.CO', {
      x: col(8),
      y: 6.72,
      w: span(4),
      g: ink,
      color: ink.strong,
      align: 'right',
    });
    s.addNotes(
      'COVER — the ODD hero, one per deck.\n' +
        'The mark sits in the middle of a hairline mosaic of real archive photographs (never stock, never one hero image), dimmed by an Ink scrim so the statement reads. Replace the twelve photos with whatever the deck is about; keep the 4x3 grid and the 1px gaps. The line under the mark is a Heading, not a Hero: the mark is the loudest thing here.',
    );
  }

  /* 02 — Minimal cover ------------------------------------------------ */
  {
    const s = pres.addSlide({ masterName: 'ODD Paper Full' });
    lockup(s, 'odd-mark', { x: M.l, y: 0.55, h: 0.42, tone: 'ink' });
    rule(s, { x: M.l, y: 1.3, w: CONTENT, color: paper.rule });
    eyebrow(s, 'ABOUT ODD', { x: M.l, y: 3.0, w: span(6), g: paper });
    text(s, 'Creativity belongs closer to the centre.', {
      x: M.l,
      y: 3.4,
      w: CONTENT,
      h: lines(3, T.hero),
      ...T.hero,
      color: paper.figure,
    });
    rule(s, { x: M.l, y: 6.55, w: CONTENT, color: paper.rule });
    eyebrow(s, 'NEW NORDIC WAY RF · HELSINKI', { x: M.l, y: 6.75, w: span(6), g: paper });
    eyebrow(s, 'ALLTHINGSODD.CO', { x: col(8), y: 6.75, w: span(4), g: paper, align: 'right' });
    s.addNotes(
      'MINIMAL COVER — the daylight alternative to slide 01, for a document-like deck: a proposal, a board paper, a report.\n' +
        'Paper ground, Ink mark at nav size, the title at Hero anchored to the bottom half. Nothing else. Headlines are sentences and end with a full stop; Forta capitalises for you, so write in sentence case.',
    );
  }

  /* 03 — Manifesto ---------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ALL THINGS ODD');
    eyebrow(s, 'WHY ODD', { x: M.l, y: M.t, w: CONTENT, align: 'center' });
    text(
      s,
      premise(
        'Finland has creative talent.',
        'What’s missing are the structures that help it grow, connect and last.',
      ),
      {
        x: M.l,
        y: 0.9,
        w: CONTENT,
        h: BOTTOM - 0.9,
        ...T.hero,
        align: 'center',
        valign: 'middle',
      },
    );
    s.addNotes(
      'MANIFESTO — the argument in one breath. One per deck, never two.\n' +
        'Premise, then point: the first sentence sits in quiet grey, the second in full Paper, in one text box with two runs. Hero is the only size on the slide; if the statement needs more than six lines, it is not a statement yet.',
    );
  }

  /* 04 — Section divider ---------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink Full' });
    rail(s, {
      items: [
        { kind: 'logo' },
        { kind: 'word', text: 'ODDfest' },
        { kind: 'meta', text: 'HELSINKI' },
        { kind: 'meta', text: '2027' },
      ],
    });
    const x = 1.6;
    text(s, '02', { x, y: 0.85, w: 2, h: lines(1, T.hero), ...T.hero, color: ink.quiet });
    rule(s, { x, y: 2.3, w: RIGHT - x, color: ink.ruleStrong });
    eyebrow(s, 'CHAPTER TWO', { x, y: 2.6, w: 4 });
    text(s, 'Helsinki’s creative week.', {
      x,
      y: 3.0,
      w: 8,
      h: lines(2, T.display),
      ...T.display,
      color: ink.figure,
    });
    eyebrow(s, 'WHAT ODDFEST IS · HOW TO JOIN · HIGHLIGHTS FROM 2026', { x, y: 6.5, w: RIGHT - x });
    s.addNotes(
      'SECTION DIVIDER — one per chapter, and only if the deck really has chapters.\n' +
        'The number is the loudest thing on it (Forta at Hero, in quiet grey), the chapter title sits at Display under a hairline, and the line of small capitals at the bottom says what is in the chapter. The rail is optional and belongs on two to four slides at most — it is a ticker, not a frame.',
    );
  }

  /* 05 — Big idea ------------------------------------------------------ */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFERENCE');
    eyebrow(s, 'THE PREMISE', { x: M.l, y: EYEBROW_Y, w: span(6) });
    text(s, 'What can business and the rest of society learn from creative expertise?', {
      x: M.l,
      y: 1.3,
      w: CONTENT,
      h: lines(4, T.hero),
      ...T.hero,
      color: ink.figure,
    });
    rule(s, { x: M.l, y: 5.5, w: CONTENT, color: ink.rule });
    eyebrow(s, 'HELSINKI · 2027', { x: M.l, y: 5.75, w: span(4) });
    text(
      s,
      'ODDference is a business conference built around creative and cultural expertise. It brings that expertise into the questions business and society are facing now.',
      {
        x: col(6),
        y: 5.75,
        w: span(6),
        h: lines(3, T.body),
        ...T.body,
        color: ink.muted,
      },
    );
    s.addNotes(
      'BIG IDEA — one sentence at Hero, with the support underneath it rather than beside it.\n' +
        'Everything below the hairline is quiet: a label on the left, two or three lines of Body on the right. The empty space above the hairline is doing work; do not fill it.',
    );
  }

  /* 06 — Text + image -------------------------------------------------- */
  {
    // Photo master: the photograph runs under the page number at the top
    // right, and the Ink master's quiet number would disappear into it.
    const s = pres.addSlide({ masterName: 'ODD Photo' });
    meta(s, 'ODDFEST');
    photo(s, 'oddfest-oddtheatre.jpg', { x: SLIDE.w - HALF_W, y: 0, w: HALF_W, h: SLIDE.h });
    eyebrow(s, 'WHAT ODDFEST IS', { x: M.l, y: EYEBROW_Y, w: span(6) });
    text(s, 'One shared week, made by Helsinki’s creative communities.', {
      x: M.l,
      y: 1.25,
      w: span(6),
      h: lines(5, T.display),
      ...T.display,
      color: ink.figure,
    });
    text(
      s,
      'ODDfest is a week of independently made events across Helsinki. Artists, collectives, venues, organisations and companies make and produce their own.',
      {
        x: M.l,
        y: 4.95,
        w: span(6),
        h: lines(4, T.body),
        ...T.body,
        color: ink.muted,
      },
    );
    pill(s, 'SUBMIT AN EVENT IDEA', { x: M.l, y: 6.4 });
    s.addNotes(
      'TEXT + IMAGE — the workhorse. Text on the left, one photograph bleeding off the right edge, full height.\n' +
        'The photo is evidence, so crop it to the action. Keep the 1.28in gutter between the text column and the picture; nothing else sits in it. Round belongs only to the thing you act on: the pill.',
    );
  }

  /* 07 — Image + text (mirror) ----------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFERENCE', { x: col(6) });
    photo(s, 'oddference-stage.jpg', { x: 0, y: 0, w: HALF_W, h: SLIDE.h });
    eyebrow(s, '02 · MEET', { x: col(6), y: EYEBROW_Y, w: span(6) });
    text(s, 'Connect with people outside your usual circuit.', {
      x: col(6),
      y: 1.25,
      w: span(6),
      h: lines(4, T.display),
      ...T.display,
      color: ink.figure,
    });
    text(
      s,
      'ODDference brings together creative leaders, business leaders, founders, policymakers, institutions and researchers — putting potential clients, partners and collaborators in the same room who rarely meet at a single-industry conference.',
      {
        x: col(6),
        y: 4.35,
        w: span(6),
        h: lines(6, T.body),
        ...T.body,
        color: ink.muted,
      },
    );
    s.addNotes(
      'IMAGE + TEXT — slide 06 mirrored. Alternate the two so a run of them reads as a rhythm rather than a list.\n' +
        'Numbered eyebrows (01, 02, 03) tie a run together. Body copy stops at six lines; past that it is two slides.',
    );
  }

  /* 08 — Full-bleed image ---------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Photo' });
    photo(s, 'fullbleed-valerie-june.jpg', { x: 0, y: 0, w: SLIDE.w, h: SLIDE.h });
    scrim(s, { transparency: 60 });
    scrimFade(s, { y: 3.1, h: 1.8, from: 88, to: 45, steps: 16 });
    meta(s, 'ODDFEST 2026', { color: ink.strong });
    text(s, premise('The theme was Bravery.', 'Turned out it wasn’t just a theme.'), {
      x: M.l,
      y: 4.2,
      w: span(10),
      h: lines(3, T.display),
      ...T.display,
    });
    text(s, 'ODDfest 2026 · Vanha Ylioppilastalo', {
      x: M.l,
      y: 6.65,
      w: span(6),
      h: 0.3,
      ...T.small,
      color: ink.muted,
    });
    text(s, 'Photo: ODDfest', {
      x: col(8),
      y: 6.65,
      w: span(4),
      h: 0.3,
      ...T.small,
      color: ink.muted,
      align: 'right',
    });
    s.addNotes(
      'FULL-BLEED PHOTOGRAPH — a breath between chapters, or the proof under a claim.\n' +
        'Scrim rules: Ink only (never black), a light wash over the whole frame and a stronger one where the type sits. Caption bottom left, credit bottom right, both Small at 60%. Real ODD moments only — no stock, no mock-ups.',
    );
  }

  /* 09 — Quote ---------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFEST 2026');
    eyebrow(s, 'THANK YOU', { x: M.l, y: M.t, w: CONTENT, align: 'center' });
    text(
      s,
      [
        {
          text: '“A hero is an ordinary individual who finds the strength to ',
          options: { color: ink.quiet },
        },
        { text: 'persevere and endure', options: { color: ink.figure } },
        { text: ' in spite of overwhelming obstacles.”', options: { color: ink.quiet } },
      ],
      {
        x: col(1),
        y: 1.5,
        w: span(10),
        h: lines(5, T.display),
        ...T.display,
        align: 'center',
      },
    );
    eyebrow(s, '— CHRISTOPHER REEVE', { x: col(1), y: 5.5, w: span(10), align: 'center' });
    s.addNotes(
      'QUOTE — someone else’s words, never dressed up as ODD’s.\n' +
        'Display size, centred, with the part that matters in full Paper and the rest quiet — the same premise-then-point move as a two-sentence headline. Attribution in small tracked capitals. No quotation-mark decoration beyond the marks themselves.',
    );
  }

  /* 10 — Three columns -------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ABOUT ODD');
    const top = sectionHead(s, {
      eyebrow: 'WHAT WE BUILD',
      title: 'Different problems need different structures.',
    });
    const items = [
      {
        n: '01',
        title: 'Events create reasons to gather',
        body: 'ODDfest makes creative activity across Helsinki visible as one shared week. ODDference creates a deliberately composed professional room around creative expertise.',
      },
      {
        n: '02',
        title: 'Spaces give people somewhere to return',
        body: 'ODDspace is the everyday layer: somewhere to work, meet, host things and keep going between projects and events.',
      },
      {
        n: '03',
        title: 'Projects and relationships let something continue',
        body: 'ODDagency, partnerships and the developing ODDnetwork create ways to keep working together when there is a real reason to do so.',
      },
    ];
    cells(s, {
      x: M.l,
      y: top,
      w: CONTENT,
      h: 4.5,
      items,
      cols: 3,
      draw: (c, item) => {
        const pad = 0.28;
        eyebrow(s, item.n, {
          x: c.x + pad,
          y: c.y + 0.3,
          w: c.w - 2 * pad,
          g: ink.card,
          align: 'center',
        });
        text(s, item.title, {
          x: c.x + pad,
          y: c.y + 0.72,
          w: c.w - 2 * pad,
          h: lines(4, T.heading),
          ...T.heading,
          color: ink.card.figure,
          align: 'center',
        });
        text(s, item.body, {
          x: c.x + pad,
          y: c.y + 2.72,
          w: c.w - 2 * pad,
          h: lines(5, T.small),
          ...T.small,
          color: ink.card.muted,
          align: 'center',
        });
      },
    });
    s.addNotes(
      'THREE COLUMNS — three things of the same kind, numbered. Not a list of features: three answers to one question.\n' +
        'Raised Backstage cells with 1px gaps between them, so the Ink ground draws the grid. Numbers in small tracked capitals, titles at Heading, body at Small. Two columns or four work the same way; five do not.',
    );
  }

  /* 11 — Numbers -------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Paper' });
    meta(s, 'ALL THINGS ODD', { g: paper });
    const top = sectionHead(s, {
      eyebrow: 'ALREADY IN MOTION',
      title: 'Two years in, this is what\nhas already happened.',
      titleLines: 2,
      g: paper,
    });
    text(
      s,
      'ODD began with the first ODDfest in 2025. Since then, ODDference and ODDspace have joined it, alongside project work with organisations. The figures below are cumulative across that work.',
      {
        x: (SLIDE.w - 7.6) / 2,
        y: top,
        w: 7.6,
        h: lines(3, T.body),
        ...T.body,
        color: paper.muted,
        align: 'center',
      },
    );
    figures(s, {
      x: M.l,
      y: 4.3,
      w: CONTENT,
      g: paper,
      align: 'center',
      items: [
        { value: '5,000+', label: 'Participants' },
        { value: '500+', label: 'Collaborators' },
        { value: '100+', label: 'Partners' },
        { value: '€400K+', label: 'Directly into creative & cultural industries' },
      ],
    });
    text(s, 'ODDfest 2026 was a co-created effort.', {
      x: M.l,
      y: 6.15,
      w: CONTENT,
      h: 0.3,
      ...T.small,
      color: paper.muted,
      align: 'center',
    });
    pill(s, 'CHECK OUT THE THANK-YOU PAGE', {
      x: (SLIDE.w - pillWidth('CHECK OUT THE THANK-YOU PAGE')) / 2,
      y: 6.5,
      variant: 'outline',
      g: paper,
    });
    s.addNotes(
      'NUMBERS — the daylight slide. Paper ground, Ink type: a full inversion, not a lighter dark slide.\n' +
        'Figures in Forta at Display, what they count in small tracked capitals under them, 1px hairlines between. Four figures is the most that stays readable. Never invent one: every figure here is on allthingsodd.co.',
    );
  }

  /* 12 — Timeline -------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ABOUT ODD');
    const top = sectionHead(s, { eyebrow: 'OUR STORY', title: 'How we got here.' });
    const rows = [
      {
        year: '2023',
        title: 'New Nordic Way rf',
        body: 'The association is founded in Helsinki. The idea that becomes ODD is still taking shape.',
        h: 1.15,
      },
      {
        year: '2024',
        title: 'Finding the gap',
        body: 'The question becomes clearer: more can happen when there is greater continuity around the work, and stronger links between creative fields and the rest of society.',
        h: 1.45,
      },
      {
        year: '2025',
        title: 'The first ODDfest',
        body: 'The first public experiment brings 2,600+ participants, 350+ contributors and 70+ partners together in Helsinki.',
        h: 1.15,
      },
      {
        year: '2026',
        title: 'More than one event',
        body: 'Creative Week tests a distributed city-wide model. ODDference tests the professional proposition. ODDspace creates a year-round physical base.',
        h: 1.45,
      },
    ];
    let y = top;
    rows.forEach((row) => {
      rule(s, { x: M.l, y, w: CONTENT, color: ink.rule });
      text(s, row.year, {
        x: M.l,
        y: y + 0.2,
        w: span(2),
        h: lines(1, T.heading),
        ...T.heading,
        color: ink.figure,
      });
      text(s, row.title, {
        x: col(2),
        y: y + 0.26,
        w: span(3),
        h: lines(2, T.runIn),
        ...T.runIn,
        color: ink.figure,
      });
      text(s, row.body, {
        x: col(5),
        y: y + 0.26,
        w: span(7),
        h: lines(3, T.body),
        ...T.body,
        color: ink.muted,
      });
      y += row.h;
    });
    rule(s, { x: M.l, y, w: CONTENT, color: ink.rule });
    s.addNotes(
      'TIMELINE — years as rows, separated by hairlines. Reads as a record, not a roadmap.\n' +
        'Year in Forta at Heading, the name of the year in Gabarito SemiBold at Body size, what happened in Body at 60%. Rows can be different heights; the hairlines keep them one system. Do not put a year on it that has not happened unless the slide says so.',
    );
  }

  /* 13 — Ecosystem -------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ALL THINGS ODD');
    lockup(s, 'odd-mark', { cx: SLIDE.w / 2, y: 0.95, h: 0.5 });
    text(
      s,
      'ODD is operated by New Nordic Way rf, a Finnish non-profit association based in Helsinki.',
      {
        x: M.l,
        y: 1.6,
        w: CONTENT,
        h: 0.3,
        ...T.small,
        color: ink.quiet,
        align: 'center',
      },
    );
    // the architecture: one mark, three ways in
    vrule(s, { x: SLIDE.w / 2, y: 2.05, h: 0.35, color: ink.ruleStrong });
    const centres = [0, 1, 2].map((i) => M.l + (i + 0.5) * (CONTENT / 3));
    rule(s, { x: centres[0], y: 2.4, w: centres[2] - centres[0], color: ink.ruleStrong });
    centres.forEach((cx) => vrule(s, { x: cx, y: 2.4, h: 0.25, color: ink.ruleStrong }));
    const platforms = [
      {
        name: 'oddfest',
        meta: 'ACROSS HELSINKI',
        body: 'Helsinki’s creative week, bringing independent events, ideas and creative communities into one shared week.',
      },
      {
        name: 'oddference',
        meta: 'BUSINESS & SOCIETY',
        body: 'A business conference exploring what business and society can learn from the creative world.',
      },
      {
        name: 'oddspace',
        meta: 'VALLILA · YEAR-ROUND',
        body: 'A year-round home for creative work — workspace, studios, events and community under one roof.',
      },
    ];
    cells(s, {
      x: M.l,
      y: 2.6,
      w: CONTENT,
      h: 2.6,
      items: platforms,
      cols: 3,
      draw: (c, item) => {
        const pad = 0.3;
        lockup(s, item.name, { x: c.x + pad, y: c.y + 0.28, h: 0.32 });
        eyebrow(s, item.meta, { x: c.x + pad, y: c.y + 0.85, w: c.w - 2 * pad, g: ink.card });
        text(s, item.body, {
          x: c.x + pad,
          y: c.y + 1.2,
          w: c.w - 2 * pad,
          h: lines(3, T.small),
          ...T.small,
          color: ink.card.muted,
        });
      },
    });
    // the fourth way in is not a product but a conversation
    band(s, { x: M.l, y: 5.45, w: CONTENT, h: 1.45, color: ink.raised });
    band(s, { x: M.l, y: 5.45, w: 0.028, h: 1.45, color: ink.heat });
    eyebrow(s, 'FOR ORGANISATIONS', { x: M.l + 0.4, y: 5.68, w: span(5), g: ink.card });
    text(s, 'Work with ODD', {
      x: M.l + 0.4,
      y: 5.98,
      w: span(5),
      h: lines(1, T.heading),
      ...T.heading,
      color: ink.card.figure,
    });
    text(
      s,
      'Bring us a question, brief, event or partnership idea. We build the right team, format and creative expertise around it.',
      {
        x: col(5),
        y: 5.75,
        w: span(3),
        h: lines(3, T.small),
        ...T.small,
        color: ink.card.muted,
      },
    );
    pill(s, 'EXPLORE WORK WITH ODD', {
      x: RIGHT - 0.4 - pillWidth('EXPLORE WORK WITH ODD'),
      y: 5.95,
      variant: 'outline',
      g: ink.card,
    });
    s.addNotes(
      'ECOSYSTEM — what ODD is made of, in one picture. Use it early, once.\n' +
        'The mark at the top, hairlines down to the three lockups, and the band underneath for the fourth way in. Lockups are never retyped, recoloured or stretched: place the PNG at a height and let the width follow. Clear space around a lockup is half the mark’s height. The Ember keyline on the band is the one accent on the slide.',
    );
  }

  /* 14 — Partners --------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ALL THINGS ODD');
    const top = sectionHead(s, {
      eyebrow: 'PARTNERS & SUPPORTERS',
      title: 'Made with organisations like these.',
    });
    const logos = [
      'moomin',
      'genelec',
      'holvi',
      'tiketti',
      'suomenkulttuurirahasto',
      'suomenyrittajat',
      'suomentekstiilijamuoti',
      'yksityisyrittajansaatio',
      'eit',
      'lasipalatsikortteli',
      'kauppakamari',
      'helsinkiplayground',
      'helsinkicasting',
      'radicalcreativity',
      'adventureclub',
      'prodjfinland',
      'dottir',
      'liwlig',
      'latorrefazione',
      'uneton',
      'sanfrancisco',
      'tresmeder',
    ];
    cells(s, {
      x: M.l,
      y: top,
      w: CONTENT,
      h: BOTTOM - top - 0.1,
      items: [...logos, null, null],
      cols: 6,
      draw: (c, name) => {
        if (name)
          partnerLogo(s, name, { x: c.x + 0.3, y: c.y + 0.28, w: c.w - 0.6, h: c.h - 0.56 });
      },
    });
    s.addNotes(
      'PARTNERS — other people’s marks, in one weight, in one grid.\n' +
        'Every logo is rendered monochrome in the figure colour (the site’s brightness(0) invert(1)) and sits inside its own cell with equal air around it — never scaled to the same width, never given a coloured tile. Empty cells at the end are part of the grid, not a mistake. Keep the order stable: alphabetical or by the order they joined, and never by size of cheque.',
    );
  }

  /* 15 — People ------------------------------------------------------------ */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFERENCE 2026');
    const top = sectionHead(s, {
      eyebrow: 'PAST SPEAKERS · ODDFERENCE 2026',
      title: 'People who joined us last time.',
    });
    const people = [
      { file: 'sanna-kaisa-niikko', name: 'Sanna-Kaisa Niikko', role: 'CMO — Marimekko' },
      { file: 'siamak-naghian', name: 'Siamäk Naghian', role: 'CEO — Genelec' },
      {
        file: 'ashley-jex-wagner',
        name: 'Ashley Jex Wagner',
        role: 'Head of Live Experiences — Supercell',
      },
      { file: 'atte-jaaskelainen', name: 'Atte Jääskeläinen', role: 'President — Sitra' },
      { file: 'perttu-polonen', name: 'Perttu Pölönen', role: 'Futurist, Inventor & Author' },
      { file: 'galit-ariel', name: 'Galit Ariel', role: 'Techno-Futurist & Author' },
      { file: 'alf-rehn', name: 'Alf Rehn', role: 'Professor of Innovation & Management' },
      { file: 'rolf-ekroth', name: 'Rolf Ekroth', role: 'Fashion Designer' },
      { file: 'samppa-lappalainen', name: 'Samppa Lappalainen', role: 'Architect & Entrepreneur' },
      { file: 'anna-brchisky', name: 'Anna Brchisky', role: 'CEO — Bamla' },
    ];
    cells(s, {
      x: M.l,
      y: top,
      w: CONTENT,
      h: BOTTOM - top,
      items: people,
      cols: 5,
      draw: (c, p) => {
        const ph = c.w / ASPECT.face;
        photo(s, `speaker-${p.file}.jpg`, { x: c.x, y: c.y, w: c.w, h: ph });
        text(s, p.name, {
          x: c.x + 0.1,
          y: c.y + ph + 0.14,
          w: c.w - 0.2,
          h: lines(1, T.nameSmall),
          ...T.nameSmall,
          color: ink.card.figure,
        });
        text(s, p.role, {
          x: c.x + 0.1,
          y: c.y + ph + 0.43,
          w: c.w - 0.2,
          h: lines(2, T.small),
          ...T.small,
          color: ink.card.muted,
        });
      },
    });
    s.addNotes(
      'PEOPLE — a room, not a wall of headshots. Ten is the most that stays a room.\n' +
        'Portraits greyscale (colour is for the work, not the people), each in its own cell over a Backstage band with the name in Forta at Small and the role in Gabarito under it. Crop to the face. Same crop, same greyscale, same order every time — no one is bigger than anyone else.',
    );
  }

  /* 16 — Programme --------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFERENCE 2026');
    const top = sectionHead(s, {
      eyebrow: 'SESSION HIGHLIGHTS · ODDFERENCE 2026',
      title: 'What was actually on stage.',
    });
    const sessions = [
      {
        title: 'From Products to Worlds: Who Wins in the Experience Economy?',
        format: 'FIRESIDE CHAT',
        who: 'Ashley Jex Wagner, Marley Prudeaux & Miika Salmi Lipiäinen',
      },
      {
        title: 'Leading Organizational Creativity — How To Make It or Break It',
        format: 'FIRESIDE CHAT',
        who: 'Siamäk Naghian, Aino Ahlnäs, Timo Karanko & Kimmo Timonen',
      },
      {
        title: 'What World-Class Brands Do Differently: Inside Creative Work at the Highest Level',
        format: 'FIRESIDE CHAT',
        who: 'Alexander Pihlainen, Risto Lähdesmäki & Kivi Sotamaa',
      },
      {
        title: 'New Media in the Attention Economy — What Has Changed?',
        format: 'FIRESIDE CHAT',
        who: 'Anna Brchisky, Klaus Hietala & Olli Seuri',
      },
      {
        title: 'The Art of Renewal: Rewiring Organizational Change',
        format: 'FIRESIDE CHAT',
        who: 'Karoliina Jarenko, Simo Routarinne & Mikko Heikinpoika',
      },
    ];
    // the section head's own hairline opens the list, so rows rule between
    const first = top + 0.06;
    const rowH = (BOTTOM - first) / sessions.length;
    sessions.forEach((row, i) => {
      const y = first + i * rowH;
      if (i) rule(s, { x: M.l, y, w: CONTENT, color: ink.rule });
      text(s, row.title, {
        x: M.l,
        y: y + 0.22,
        w: span(7),
        h: lines(2, T.name),
        ...T.name,
        color: ink.figure,
      });
      eyebrow(s, row.format, { x: col(8), y: y + 0.2, w: span(4), color: ink.business });
      text(s, row.who, {
        x: col(8),
        y: y + 0.46,
        w: span(4),
        h: lines(2, T.small),
        ...T.small,
        color: ink.muted,
      });
    });
    rule(s, { x: M.l, y: BOTTOM, w: CONTENT, color: ink.rule });
    s.addNotes(
      'PROGRAMME — sessions as rows: what it was called on the left, what kind of thing it was and who was in it on the right.\n' +
        'Session titles are Forta at the Body size, not a sixth type size. The format label carries the one accent on the slide — Signal for the business side, Ember for the creative one. Names in Small at 60%: the session is the headline, the people are the detail.',
    );
  }

  /* 17 — Case study --------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFEST 2026', { x: col(6) });
    photo(s, 'case-odd-deep-space.jpg', { x: 0, y: 0, w: HALF_W, h: SLIDE.h });
    eyebrow(s, 'ODDFEST 2026 · KAMPPI CHAPEL', { x: col(6), y: EYEBROW_Y, w: span(6) });
    text(s, 'ODD Deep Space', {
      x: col(6),
      y: 1.3,
      w: span(6),
      h: lines(1, T.display),
      ...T.display,
      color: ink.figure,
    });
    text(s, 'With Simo Vassinen and 13 facilitators', {
      x: col(6),
      y: 2.15,
      w: span(6),
      h: 0.3,
      ...T.body,
      color: ink.strong,
    });
    rule(s, { x: col(6), y: 2.7, w: span(6), color: ink.rule });
    text(
      s,
      'ODD Deep Space transformed Kamppi Chapel into a dreamlike satellite where body, mind and urgent questions about the future came together through movement, sound and experimental formats. Across two days, visitors explored themes from work, wellbeing and money to AI, planetary limits and feminist futures, guided by artist and somatic facilitator Simo Vassinen and a diverse group of thinkers, movers and makers.',
      {
        x: col(6),
        y: 2.95,
        w: span(6),
        h: lines(9, T.body),
        ...T.body,
        color: ink.muted,
      },
    );
    s.addNotes(
      'CASE STUDY — one thing that happened, with the photograph as the evidence.\n' +
        'Eyebrow says where and when, the title is what it was called, the “With…” line credits the people who made it, and the body is what actually happened. Made with someone else, always: the credit line is not optional.',
    );
  }

  /* 18 — Two sides ----------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Photo' });
    meta(s, 'ALL THINGS ODD', { x: col(2), color: ink.quiet });
    const strip = 2.4306;
    photo(s, 'strip-creative.jpg', { x: 0, y: 0, w: strip, h: SLIDE.h });
    photo(s, 'strip-business.jpg', { x: SLIDE.w - strip, y: 0, w: strip, h: SLIDE.h });
    const left = { x: col(2), w: span(4) - 0.28 }; // flush right, clear of the hairline
    const right = { x: col(6) + 0.28, w: span(4) - 0.28 };
    text(
      s,
      'ODD brings two worlds together — creative and cultural people, and businesses that want to work with them.',
      {
        x: left.x,
        y: 0.85,
        w: right.x + right.w - left.x,
        h: lines(2, T.body),
        ...T.body,
        color: ink.strong,
        align: 'center',
      },
    );
    vrule(s, { x: SLIDE.w / 2, y: 1.6, h: 5.3, color: ink.rule });
    const side = (o, { label, color, lede, body, actions, align }) => {
      eyebrow(s, label, { ...o, y: 1.75, color, align });
      text(s, lede, {
        ...o,
        y: 2.1,
        h: lines(5, T.heading),
        ...T.heading,
        color: ink.figure,
        align,
      });
      text(s, body, { ...o, y: 4.6, h: lines(3, T.body), ...T.body, color: ink.muted, align });
      actions.forEach((a, i) => {
        const w = pillWidth(a);
        pill(s, a, {
          x: align === 'right' ? o.x + o.w - w : o.x,
          y: 5.9 + i * 0.56,
          w,
          variant: 'outline',
        });
      });
    };
    side(left, {
      label: 'FOR CREATIVES',
      color: ink.creative,
      align: 'right',
      lede: 'Work, create and connect with other creatives.',
      body: 'Work from ODDspace. Bring something of your own to ODDfest.',
      actions: ['ODDFEST', 'ODDSPACE'],
    });
    side(right, {
      label: 'FOR BUSINESS',
      color: ink.business,
      align: 'left',
      lede: 'Get closer to creative expertise and the people behind it.',
      body: 'Come to ODDference, build a partnership, or bring us a brief.',
      actions: ['ODDFERENCE', 'WORK WITH ODD'],
    });
    s.addNotes(
      'TWO SIDES — the only slide where both accents appear. Creative always first, on the left, in Ember; business on the right, in Signal.\n' +
        'The two columns are mirrored around the hairline, not simply repeated: the creative side is flush right, the business side flush left. Keep the two bodies within a line of each other in length — the symmetry is the argument.',
    );
  }

  /* 19 — Closing statement ---------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFEST 2027');
    band(s, { x: M.l, y: 1.15, w: CONTENT, h: 5.35, color: ink.raised });
    eyebrow(s, 'HOW TO JOIN', { x: col(1), y: 1.7, w: span(10), g: ink.card, align: 'center' });
    text(s, 'Bring something to ODDfest 2027.', {
      x: col(1),
      y: 2.2,
      w: span(10),
      h: lines(2, T.hero),
      ...T.hero,
      color: ink.card.figure,
      align: 'center',
    });
    text(
      s,
      'We are collecting event ideas now, before the dates are fixed — which is the best moment to bring one. An idea still at the notes-on-your-phone stage is a fine thing to send.',
      {
        x: (SLIDE.w - 7.2) / 2,
        y: 4.5,
        w: 7.2,
        h: lines(3, T.body),
        ...T.body,
        color: ink.card.muted,
        align: 'center',
      },
    );
    const a = pillWidth('SUBMIT AN EVENT IDEA');
    const b = pillWidth('ASK US A QUESTION FIRST');
    const x0 = (SLIDE.w - (a + b + 0.2)) / 2;
    pill(s, 'SUBMIT AN EVENT IDEA', { x: x0, y: 5.6, w: a, g: ink.card });
    pill(s, 'ASK US A QUESTION FIRST', {
      x: x0 + a + 0.2,
      y: 5.6,
      w: b,
      variant: 'outline',
      g: ink.card,
    });
    s.addNotes(
      'CLOSING STATEMENT — the ask, on a raised Backstage panel so it reads as the one thing to do next.\n' +
        'One Hero sentence, one sentence of support, one primary pill and at most one secondary. Two solid pills side by side is one ask too many.',
    );
  }

  /* 20 — Contact ----------------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Paper' });
    meta(s, 'GET IN TOUCH', { g: paper });
    lockup(s, 'odd-mark', { x: M.l, y: 1.25, h: 0.5, tone: 'ink' });
    text(s, 'Say hello.', {
      x: M.l,
      y: 2.1,
      w: span(6),
      h: lines(1, T.hero),
      ...T.hero,
      color: paper.figure,
    });
    text(
      s,
      'A question, idea, project, press request, ODDfest submission or something else — send us a note. We’ll get it to the right person.',
      {
        x: M.l,
        y: 3.4,
        w: span(5),
        h: lines(4, T.body),
        ...T.body,
        color: paper.muted,
      },
    );
    pill(s, 'HELLO@ODDFEST.CO', { x: M.l, y: 5.1, g: paper });
    const rows = [
      ['EMAIL', 'hello@oddfest.co'],
      ['WEB', 'allthingsodd.co'],
      ['ODDSPACE', 'Teollisuuskatu 9D, Vallila, Helsinki'],
      ['INSTAGRAM', '@oddfest.fi'],
      ['LINKEDIN', 'linkedin.com/company/oddfest'],
      ['NEWSLETTER', 'oddfest.beehiiv.com'],
    ];
    rows.forEach(([label, value], i) => {
      const y = 1.25 + i * 0.72;
      rule(s, { x: col(6), y, w: span(6), color: paper.rule });
      eyebrow(s, label, { x: col(6), y: y + 0.24, w: span(2), g: paper });
      text(s, value, { x: col(8), y: y + 0.2, w: span(4), h: 0.3, ...T.body, color: paper.figure });
    });
    rule(s, { x: col(6), y: 1.25 + rows.length * 0.72, w: span(6), color: paper.rule });
    text(s, 'New Nordic Way rf · Helsinki', {
      x: M.l,
      y: 6.6,
      w: span(6),
      h: 0.3,
      ...T.small,
      color: paper.legal,
    });
    s.addNotes(
      'CONTACT — the last slide, on Paper.\n' +
        'The address is always hello@oddfest.co, never an @allthingsodd.co address; the site is allthingsodd.co. The email is a pill because it is a thing you act on. Check the ODDspace address against the site before sending a deck out.',
    );
  }

  /* 21 — Blank ------------------------------------------------------------------- */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ALL THINGS ODD');
    s.addNotes(
      'BLANK — the frame, and nothing else: Ink ground, meta line, page number.\n' +
        'For a composition none of the other twenty archetypes fit. The grid still applies: 0.625in side margins, 0.5in top and bottom, 12 columns with a 0.25in gutter. Five type sizes (Hero 72 / Display 48 / Heading 30 / Body 18 / Small 14), Forta for statements, Gabarito for anything read or operated. One accent, used as text or a keyline — never as a fill. If the slide needs a sixth size or a second accent, it needs two slides.',
    );
  }
}
