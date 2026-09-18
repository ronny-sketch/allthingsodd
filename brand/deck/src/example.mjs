// all-things-odd-example.pptx — twelve slides that say what ODD is, built
// from the archetypes in the template and nothing else. Every word is on
// allthingsodd.co; nothing here is written for the deck.

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
  photo,
  pill,
  pillWidth,
  premise,
  rule,
  sectionHead,
  scrim,
  span,
  text,
  vrule,
} from './odd.mjs';

const MOSAIC = ['02', '05', '08', '11', '01', '04', '07', '10', '03', '06', '09', '12'];

export function exampleDeck(pres) {
  /* 01 — Cover */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink Full' });
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
    scrim(s, { transparency: 42 });
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
    eyebrow(s, 'HELSINKI · NEW NORDIC WAY RF', { x: M.l, y: 6.72, w: span(6), color: ink.strong });
    eyebrow(s, 'ALLTHINGSODD.CO', {
      x: col(8),
      y: 6.72,
      w: span(4),
      color: ink.strong,
      align: 'right',
    });
    s.addNotes('All Things ODD: ODDfest, ODDference, ODDspace, and the work around them.');
  }

  /* 02 — Why ODD exists */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ABOUT ODD');
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
    s.addNotes('The argument in one breath: the talent is here, the structures around it are not.');
  }

  /* 03 — What ODD builds */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ABOUT ODD');
    const top = sectionHead(s, {
      eyebrow: 'WHAT WE BUILD',
      title: 'Different problems need different structures.',
    });
    cells(s, {
      x: M.l,
      y: top,
      w: CONTENT,
      h: 4.5,
      cols: 3,
      items: [
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
      ],
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
    s.addNotes('One annual event cannot create continuity on its own. Three formats, three jobs.');
  }

  /* 04 — The ecosystem */
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
    vrule(s, { x: SLIDE.w / 2, y: 2.05, h: 0.35, color: ink.ruleStrong });
    const centres = [0, 1, 2].map((i) => M.l + (i + 0.5) * (CONTENT / 3));
    rule(s, { x: centres[0], y: 2.4, w: centres[2] - centres[0], color: ink.ruleStrong });
    centres.forEach((cx) => vrule(s, { x: cx, y: 2.4, h: 0.25, color: ink.ruleStrong }));
    cells(s, {
      x: M.l,
      y: 2.6,
      w: CONTENT,
      h: 2.6,
      cols: 3,
      items: [
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
      ],
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
    s.addNotes('One mark, three ways in, and a fourth that starts as a conversation.');
  }

  /* 05 — Who ODD is for */
  {
    const s = pres.addSlide({ masterName: 'ODD Photo' });
    meta(s, 'WHO ODD IS FOR', { x: col(2), color: ink.quiet });
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
    s.addNotes('Two audiences, one organisation. Creative first, always.');
  }

  /* 06 — ODDfest */
  {
    // Photo master: the photograph runs under the page number at the top
    // right, and the Ink master's quiet number would disappear into it.
    const s = pres.addSlide({ masterName: 'ODD Photo' });
    meta(s, 'ODDFEST');
    photo(s, 'oddfest-oddtheatre.jpg', { x: SLIDE.w - HALF_W, y: 0, w: HALF_W, h: SLIDE.h });
    lockup(s, 'oddfest', { x: M.l, y: 0.88, h: 0.38 });
    text(s, 'One shared week, made by Helsinki’s creative communities.', {
      x: M.l,
      y: 1.5,
      w: span(6),
      h: lines(5, T.display),
      ...T.display,
      color: ink.figure,
    });
    text(
      s,
      'ODDfest is a week of independently made events across Helsinki, and in 2026 it brought more than 150 acts to five venues.',
      {
        x: M.l,
        y: 5.25,
        w: span(6),
        h: lines(4, T.body),
        ...T.body,
        color: ink.muted,
      },
    );
    text(s, 'ODDfest 2026 · ODDtheatre at Vanha Ylioppilastalo', {
      x: SLIDE.w - HALF_W,
      y: 6.85,
      w: HALF_W - 0.4,
      h: 0.3,
      ...T.small,
      color: ink.muted,
      align: 'right',
    });
    s.addNotes(
      'Helsinki’s creative week: independently made events, one shared week, next in 2027.',
    );
  }

  /* 07 — ODDference */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFERENCE');
    lockup(s, 'oddference', { x: M.l, y: 0.88, h: 0.38 });
    text(s, 'What can business and the rest of society learn from creative expertise?', {
      x: M.l,
      y: 1.45,
      w: span(7),
      h: lines(5, T.display),
      ...T.display,
      color: ink.figure,
    });
    text(
      s,
      'The 2026 edition ran over two days in central Helsinki, with 25 speakers and more than 30 sessions.',
      {
        x: M.l,
        y: 5.15,
        w: span(5),
        h: lines(3, T.body),
        ...T.body,
        color: ink.muted,
      },
    );
    eyebrow(s, 'FIVE FIRESIDE CHATS · ODDFERENCE 2026', {
      x: col(7),
      y: 1.4,
      w: span(5),
      color: ink.business,
    });
    const sessions = [
      'From Products to Worlds: Who Wins in the Experience Economy?',
      'Leading Organizational Creativity — How To Make It or Break It',
      'What World-Class Brands Do Differently: Inside Creative Work at the Highest Level',
      'New Media in the Attention Economy — What Has Changed?',
      'The Art of Renewal: Rewiring Organizational Change',
    ];
    sessions.forEach((title, i) => {
      const y = 1.85 + i * 0.98;
      rule(s, { x: col(7), y, w: span(5), color: ink.rule });
      text(s, title, {
        x: col(7),
        y: y + 0.24,
        w: span(5),
        h: lines(2, T.nameSmall),
        ...T.nameSmall,
        color: ink.figure,
      });
    });
    rule(s, { x: col(7), y: 1.85 + 5 * 0.98, w: span(5), color: ink.rule });
    pill(s, 'GET YOUR TICKET', { x: M.l, y: 6.3 });
    s.addNotes(
      'The premise, and what it actually sounded like on stage in 2026. Tickets: €299 Blind Bird + VAT 13.5%.',
    );
  }

  /* 08 — ODDspace (the daylight moment) */
  {
    const s = pres.addSlide({ masterName: 'ODD Paper' });
    meta(s, 'ODDSPACE · VALLILA', { g: paper });
    lockup(s, 'oddspace', { x: M.l, y: 0.88, h: 0.38, tone: 'ink' });
    text(s, 'A year-round home for creative work.', {
      x: M.l,
      y: 1.4,
      w: span(7),
      h: lines(2, T.display),
      ...T.display,
      color: paper.figure,
    });
    text(
      s,
      'Workspace, studios, events and community under one roof — in Vallila, for people working across art, culture, design, media, technology and business.',
      {
        x: col(7),
        y: 1.5,
        w: span(5),
        h: lines(5, T.body),
        ...T.body,
        color: paper.muted,
      },
    );
    const rooms = [
      { file: 'oddspace-coworking.jpg', name: 'Co-working space' },
      { file: 'oddspace-gallery.jpg', name: 'Event & gallery space' },
      { file: 'oddspace-auditorium.jpg', name: 'Auditorium' },
      { file: 'oddspace-studio.jpg', name: 'ODDstudio' },
    ];
    cells(s, {
      x: M.l,
      y: 3.5,
      w: CONTENT,
      h: 2.7,
      items: rooms,
      cols: 4,
      g: paper,
      draw: (c, room) => {
        const ph = c.w / ASPECT.room;
        photo(s, room.file, { x: c.x, y: c.y, w: c.w, h: ph });
        text(s, room.name, {
          x: c.x + 0.2,
          y: c.y + ph + 0.2,
          w: c.w - 0.4,
          h: lines(2, T.name),
          ...T.name,
          color: paper.card.figure,
        });
      },
    });
    text(s, 'Teollisuuskatu 9D, Vallila, Helsinki', {
      x: M.l,
      y: 6.62,
      w: span(6),
      h: 0.3,
      ...T.small,
      color: paper.muted,
    });
    pill(s, 'BECOME A MEMBER', {
      x: RIGHT - pillWidth('BECOME A MEMBER'),
      y: 6.45,
      variant: 'outline',
      g: paper,
    });
    s.addNotes(
      'ODDspace is the light theme of the whole system: the everyday, daylight layer of ODD.',
    );
  }

  /* 09 — How we got here */
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
      '2027: Creative Week becomes ODDfest, ODDference stands on its own, ODDspace continues year-round.',
    );
  }

  /* 10 — Already in motion */
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
    s.addNotes(
      'Cumulative across ODDfest 2025, ODDfest and ODDference 2026, ODDspace and project work.',
    );
  }

  /* 11 — The community */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ODDFEST 2026');
    eyebrow(s, 'WHAT HAPPENED IN 2026', { x: M.l, y: 0.95, w: span(5) });
    text(s, '274', {
      x: M.l,
      y: 1.25,
      w: span(5),
      h: lines(1, T.hero),
      ...T.hero,
      color: ink.figure,
    });
    text(s, 'people, artists, collectives and organisations made ODDfest 2026. Together.', {
      x: M.l,
      y: 2.5,
      w: span(5),
      h: lines(5, T.heading),
      ...T.heading,
      color: ink.figure,
    });
    text(
      s,
      'Creative Week ran June 8–14. ODDference took two days — more than 50 speakers and more than 30 sessions. ODDfest ran from the Friday through Saturday, with more than 150 acts across central Helsinki.',
      {
        x: M.l,
        y: 5.05,
        w: span(5),
        h: lines(5, T.body),
        ...T.body,
        color: ink.muted,
      },
    );
    const wallX = col(5);
    const wallW = RIGHT - wallX;
    const wallCell = (wallW - 4 * HAIR) / 5;
    cells(s, {
      x: wallX,
      y: 1.16,
      w: wallW,
      h: 3 * (wallCell / ASPECT.wall) + 2 * HAIR,
      cols: 5,
      rows: 3,
      items: Array.from({ length: 15 }, (_, i) => `wall-${String(i + 1).padStart(2, '0')}.jpg`),
      fill: null,
      draw: (c, file) => photo(s, file, c),
    });
    s.addNotes(
      '274 names, counted from the credits on the thank-you page — never typed in by hand.',
    );
  }

  /* 12 — Join us */
  {
    const s = pres.addSlide({ masterName: 'ODD Ink' });
    meta(s, 'ALL THINGS ODD');
    band(s, { x: M.l, y: 1.15, w: CONTENT, h: 5.35, color: ink.raised });
    eyebrow(s, 'WAYS TO TAKE PART', {
      x: col(1),
      y: 1.7,
      w: span(10),
      g: ink.card,
      align: 'center',
    });
    text(s, 'Bring something of your own.', {
      x: col(1),
      y: 2.3,
      w: span(10),
      h: lines(2, T.hero),
      ...T.hero,
      color: ink.card.figure,
      align: 'center',
    });
    text(
      s,
      'Host something at ODDfest. Join ODDspace. Come to ODDference. Or build something with ODD.',
      {
        x: (SLIDE.w - 7.2) / 2,
        y: 4.6,
        w: 7.2,
        h: lines(2, T.body),
        ...T.body,
        color: ink.card.muted,
        align: 'center',
      },
    );
    const a = pillWidth('HELLO@ODDFEST.CO');
    const b = pillWidth('ALLTHINGSODD.CO');
    const x0 = (SLIDE.w - (a + b + 0.2)) / 2;
    pill(s, 'HELLO@ODDFEST.CO', { x: x0, y: 5.5, w: a, g: ink.card });
    pill(s, 'ALLTHINGSODD.CO', { x: x0 + a + 0.2, y: 5.5, w: b, variant: 'outline', g: ink.card });
    text(s, 'New Nordic Way rf · Helsinki', {
      x: col(1),
      y: 6.75,
      w: span(10),
      h: 0.3,
      ...T.small,
      color: ink.legal,
      align: 'center',
    });
    s.addNotes(
      'Close on the ask, not on a thank-you slide. hello@oddfest.co — never an @allthingsodd.co address.',
    );
  }
}
