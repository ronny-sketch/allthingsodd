// The community-first half of ODD's social system: fourteen post formats, one
// story, one carousel and the highlight covers, all built from the brand
// system and from things ODD has actually done.
//
// Two rules this file exists to enforce, both learned the hard way:
//
//   1. NEVER put a name on a face unless the source names that face. Photos of
//      a crowd caption the night, not the people in it. A named person needs a
//      portrait we know is them (the speaker portraits in src/assets/speakers/).
//   2. Every photograph is credited. The archive's own terms are editorial use
//      with "ODDfest / photographer's name" — the examples here say
//      "Photo: ODDfest" because this generator does not know which photographer
//      took which frame. Replace it with the real name before posting.
//
// Copy is real: programme names from src/content/pages/oddfest.json, credits
// from oddfest-2026.json, ODDspace's weekly from oddspace.json. Nothing here
// invents a date, a price, a number or a quote.

export const MUSIC_2026 = [
  'Valerie June (US)',
  'Föllakzoid (CL)',
  'Paleface & Avanti!',
  'Stacy Epps (US)',
  'Dominga (CL)',
  'Kaukolampi',
  'A. Blomqvist',
  'Gone Future (SE)',
  'Clavert',
  'Electric Elisa',
  'Heith (IT)',
  'Lauer & DENA (DE)',
];

// A slice of the 274 credited on the thank-you page, alphabetical as the page
// sorts them. The real post uses the whole list across several tiles. The
// remainder below is COMPUTED from this array — a hand-typed count went wrong
// once already and published a total that was not 274.
export const CREDITED_TOTAL = 274;
export const CREDITS_SLICE = [
  '25films',
  'A. Blomqvist',
  'Aavistus',
  'Anastasia Maydanova',
  'Ari Pulkkinen',
  'Assembly (US)',
  'Ballroom Extravaganza',
  'Bar25 — Days Out of Time (DE)',
  'Casvu.ai',
  'Clavert',
  'Connection Interrupted',
  'DanceWorks Helsinki',
  'Dení Vázquez',
  'Discobingo',
  'DJ Dominga (CL)',
  'DJ PoB',
  'DJ Upi',
  'DJ WUF',
  'DocPoint',
  'Electric Elisa',
  'Espoo Game LAB',
  'Espoo Theatre',
  'Föllakzoid (CL)',
  'Gone Future (SE)',
  'Heith (IT)',
  'House of Xclusive Lanvin',
  'Kaukolampi',
  'Lauer & DENA (DE)',
  'Maryisonacid (FR)',
  'Nuua Company',
  'Paleface & Harput',
  'Q-teatteri',
  'Tyre',
  'Valerie June (US)',
  'Wanda O’rly',
];

export const posts = [
  {
    n: 1,
    kind: 'Name wall',
    family: 'People',
    ground: 'ink',
    why: 'The credit roll as a post. No photographs, no hierarchy, alphabetical — the same treatment the thank-you page gives all 274. Run it as a set of tiles across a week after an edition.',
    caption:
      '274 people, artists, collectives and organisations made ODDfest 2026. Here are some of them, alphabetically, because that is the only fair order. The whole list is on the thank-you page.',
    html: `
      <div class="pad names">
        <p class="eyebrow">Who made ODDfest 2026</p>
        <p class="name-wall">${CREDITS_SLICE.join(' · ')}</p>
        <p class="eyebrow">…and ${CREDITED_TOTAL - CREDITS_SLICE.length} more, alphabetically, on allthingsodd.co</p>
      </div>`,
  },
  {
    n: 2,
    kind: 'Who was in the room',
    family: 'People',
    ground: 'photo',
    why: 'The audience as the subject. Caption names the night, never the faces — we do not label people we have not asked.',
    caption:
      'The room on the second night. If you were in it, you are part of why it worked. Photo: ODDfest.',
    html: `
      <img class="bleed" src="images/crowd-hands.jpg" alt="">
      <div class="scrim"></div>
      <div class="pad bottom">
        <p class="eyebrow on-photo">ODDfest 2026 · Helsinki</p>
        <p class="t-display">The room is the programme.</p>
        <p class="t-small on-photo-muted">Photo: ODDfest</p>
      </div>`,
  },
  {
    n: 3,
    kind: 'Lineup card',
    family: 'Programme',
    ground: 'ink',
    why: 'Names in Forta, no photographs, one category per tile. Four of these make a lineup announcement that reads as a poster series.',
    caption:
      'Music at ODDfest 2026. Twelve of the acts who played — the full programme lives on the site.',
    html: `
      <div class="pad lineup">
        <p class="eyebrow">ODDfest 2026 · Music</p>
        <ul class="lineup-list">${MUSIC_2026.map((n) => `<li>${n}</li>`).join('')}</ul>
      </div>
      <div class="foot"><span>allthingsodd.co/oddfest</span><span class="mark"><img src="images/odd-mark-paper.png" alt=""></span></div>`,
  },
  {
    n: 4,
    kind: 'One event, one line',
    family: 'Programme',
    ground: 'photo',
    why: 'The site’s highlight card as a post: what it was, who made it, where. The host is named because the host told us their name.',
    caption:
      'ODDtheatre: Club Theatre took over the main hall — dancers, DJs, actors, models and visual artists building one night in real time, directed by Tyre. With the House of Xclusive Lanvin, Nuua, Wanda O’rly and Maryisonacid. Photo: ODDfest.',
    html: `
      <img class="bleed" src="images/theatre-purple.jpg" alt="">
      <div class="scrim"></div>
      <div class="pad bottom">
        <p class="eyebrow on-photo">ODDfest 2026 · Vanha Ylioppilastalo</p>
        <p class="t-display">ODDtheatre</p>
        <p class="t-body on-photo-muted">With more than ten collectives, directed by Tyre.</p>
      </div>`,
  },
  {
    n: 5,
    kind: 'Detail crop',
    family: 'Evidence',
    ground: 'photo',
    why: 'Hands, cables, instruments. A detail reads at thumbnail size where a wide shot does not, and it is the closest thing ODD has to texture.',
    caption: 'Somebody’s hands, somebody’s night. Photo: ODDfest.',
    html: `
      <img class="bleed" src="images/harp-singer.jpg" alt="">
      <div class="scrim soft"></div>
      <div class="pad bottom tight">
        <p class="eyebrow on-photo">ODDfest 2026</p>
      </div>`,
  },
  {
    n: 6,
    kind: 'Open call',
    family: 'Invitation',
    ground: 'paper',
    why: 'Horst’s habit: the call is always open, and it is content, not an interruption. One in six tiles asks for something.',
    caption:
      'ODDfest 2027 is collecting event ideas now, before the dates are fixed — which is the best moment to bring one. An idea still at the notes-on-your-phone stage is a fine thing to send.',
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">Open call · ODDfest 2027</p>
        <p class="t-hero">What would you put in the week?</p>
        <p class="t-body muted">An exhibition, a performance, a workshop, a screening, a dinner, an open studio, a club night — or a format nobody has tried yet.</p>
        <span class="pill-mock">Submit an event idea</span>
      </div>
      <div class="foot dark"><span>allthingsodd.co/oddfest</span><span class="mark"><img src="images/odd-mark-ink.png" alt=""></span></div>`,
  },
  {
    n: 7,
    kind: 'The weekly',
    family: 'Place',
    ground: 'photo-split',
    why: 'The everyday post. ODDspace has a rhythm — a weekly coffee, a choir, a dance night — and the rhythm is what makes a space a community rather than a venue.',
    caption:
      'Lunch, most days, with whoever is in the building. There is also Coffee on the House every week — no programme, no pitch, just the kitchen.',
    html: `
      <div class="split-photo"><img src="images/oddspace-lunch.jpg" alt=""></div>
      <div class="split-body">
        <p class="eyebrow">ODDspace · Vallila</p>
        <p class="t-display">Lunch happens here most days.</p>
      </div>`,
  },
  {
    n: 8,
    kind: 'Photo dump',
    family: 'Evidence',
    ground: 'ink',
    why: 'Four frames from one night, hairline gaps, nothing written on the pictures. The grid’s own texture, and the cheapest post to make well.',
    caption: 'One night, four frames. More in the photobank — link in bio. Photos: ODDfest.',
    html: `
      <div class="dump">
        <img src="images/stage-performer.jpg" alt=""><img src="images/crowd-colour.jpg" alt="">
        <img src="images/decks-hands.jpg" alt=""><img src="images/theatre-purple.jpg" alt="">
      </div>
      <div class="pad bottom tight">
        <p class="eyebrow">ODDfest 2026 · Photobank</p>
      </div>`,
  },
  {
    n: 9,
    kind: 'Two people talking',
    family: 'People',
    ground: 'photo',
    why: 'The actual product of ODD is two people who would not otherwise have met. This is the tile that says so without a slogan.',
    caption:
      'Most of what ODD builds is this: two people who work in different worlds, in the same room, mid-sentence. Photo: ODDfest.',
    html: `
      <img class="bleed" src="images/workshop-room.jpg" alt="">
      <div class="scrim"></div>
      <div class="pad bottom">
        <p class="eyebrow on-photo">ODDfest 2026 · Helsinki</p>
        <p class="t-display">Two people, mid-sentence.</p>
        <p class="t-small on-photo-muted">Photo: ODDfest</p>
      </div>`,
  },
  {
    n: 10,
    kind: 'Then / now',
    family: 'Evidence',
    ground: 'ink',
    why: 'Two years, one frame. Proof of continuity without a single adjective — and it only works because the archive exists.',
    caption: 'ODDfest 2025 and ODDfest 2026. Same idea, more people. Photos: ODDfest.',
    html: `
      <div class="thennow">
        <figure><img src="images/table-2025.jpg" alt=""></figure>
        <figure><img src="images/crowd-close.jpg" alt=""></figure>
      </div>
      <div class="pad bottom tight">
        <div class="thennow-years"><span>2025</span><span>2026</span></div>
        <p class="t-heading">The same idea, with more people in it.</p>
      </div>`,
  },
  {
    n: 11,
    kind: 'Repost frame',
    family: 'People',
    ground: 'photo-frame',
    why: 'When a host posts their own night, ODD reposts it inside a thin frame with their handle. The grid stays ODD; the picture stays theirs.',
    caption:
      'Live painting by VALIOBEATS (VALIOART) at ODDfest 2026. If you made something at ODDfest, tag us and it goes here, credited to you.',
    html: `
      <div class="repost">
        <div class="repost-top"><span class="eyebrow">Made by a host</span><span class="eyebrow">VALIOBEATS</span></div>
        <img src="images/live-painting.jpg" alt="">
        <div class="repost-foot"><span class="eyebrow">ODDfest 2026</span><img class="repost-mark" src="images/odd-mark-paper.png" alt=""></div>
      </div>`,
  },
  {
    n: 12,
    kind: 'A question',
    family: 'Voice',
    ground: 'ink',
    why: 'ODDference’s premise, set as a question and left there. The caption carries the argument; the tile carries the question.',
    caption:
      'ODDference is built on one question: what can business and the rest of society learn from creative expertise? Two days in Helsinki, 2027.',
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">ODDference · The premise</p>
        <p class="t-hero">What can business learn from creative expertise?</p>
      </div>
      <div class="foot"><span>allthingsodd.co/oddference</span><span class="mark"><img src="images/odd-mark-paper.png" alt=""></span></div>`,
  },
  {
    n: 13,
    kind: 'Thank the partners',
    family: 'Programme',
    ground: 'paper',
    why: 'Monochrome, equal size, named — nobody’s logo is bigger than anybody else’s. Once an edition, not every week.',
    caption: 'ODDfest 2026 was made with these organisations, and with 274 people. Thank you.',
    html: `
      <div class="pad partners">
        <p class="eyebrow">Made with</p>
        <div class="partner-grid">
          <img src="images/logo-moomin.svg" alt=""><img src="images/logo-genelec.svg" alt="">
          <img src="images/logo-holvi.svg" alt=""><img src="images/logo-tiketti.svg" alt="">
          <img src="images/logo-suomenkulttuurirahasto.svg" alt=""><img src="images/logo-kauppakamari.svg" alt="">
          <img src="images/logo-lasipalatsikortteli.svg" alt=""><img src="images/logo-dottir.svg" alt="">
        </div>
      </div>
      <div class="foot dark"><span>ODDfest 2026</span><span class="mark"><img src="images/odd-mark-ink.png" alt=""></span></div>`,
  },
  {
    n: 14,
    kind: 'The quiet one',
    family: 'Evidence',
    ground: 'photo',
    why: 'Not every tile has to shout. A room mid-afternoon, one line, no ask. It gives the loud tiles somewhere to land.',
    caption: 'A talk, an ordinary afternoon of it. Photo: ODDfest.',
    html: `
      <img class="bleed" src="images/talk-audience.jpg" alt="">
      <div class="scrim soft"></div>
      <div class="pad bottom tight">
        <p class="eyebrow on-photo">Creative Week 2026</p>
        <p class="t-heading">Most of it looks like this.</p>
      </div>`,
  },
  {
    n: 15,
    kind: 'Statement',
    family: 'Voice',
    ground: 'ink',
    why: 'The thesis, in the words the site already uses. The loudest tile there is — once a month at most.',
    caption:
      'Finland does not have a talent problem. It has a structures problem: projects end, funding ends, rooms close, and the next thing starts from scratch. ODD builds the parts that stay.',
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">Why ODD</p>
        <p class="t-hero"><span class="quiet">Finland has creative talent.</span> What’s missing are the structures that help it grow, connect and last.</p>
      </div>
      <div class="foot"><span>allthingsodd.co</span><span class="mark"><img src="images/odd-mark-paper.png" alt=""></span></div>`,
  },
  {
    n: 16,
    kind: 'Figure',
    family: 'Evidence',
    ground: 'ink',
    why: 'One number, the sentence it belongs to, nothing else. Never two numbers on one tile.',
    caption:
      '274 people, artists, collectives and organisations made ODDfest 2026. The whole list is on the thank-you page, alphabetically, with no hierarchy.',
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">What happened in 2026</p>
        <p class="figure">274</p>
        <p class="t-heading">people, artists, collectives and organisations made ODDfest 2026. Together.</p>
      </div>
      <div class="foot"><span>allthingsodd.co/oddfest-2026</span><span class="mark"><img src="images/odd-mark-paper.png" alt=""></span></div>`,
  },
  {
    n: 17,
    kind: 'Two sides',
    family: 'Voice',
    ground: 'paper',
    why: 'The only tile where Ember and Signal share a surface, because it is genuinely about both. Creative first, always.',
    caption:
      'ODD brings two worlds together — creative and cultural people, and businesses that want to work with them. Two ways in, one organisation.',
    html: `
      <div class="pad two-sides">
        <p class="t-body muted intro">ODD brings two worlds together — creative and cultural people, and businesses that want to work with them.</p>
        <div>
          <p class="eyebrow creative">For creatives</p>
          <p class="t-heading">Work, create and connect with other creatives.</p>
        </div>
        <div class="rule-h"></div>
        <div>
          <p class="eyebrow business">For business</p>
          <p class="t-heading">Get closer to creative expertise and the people behind it.</p>
        </div>
      </div>
      <div class="foot dark"><span>ODDfest · ODDference · ODDspace</span><span class="mark"><img src="images/odd-mark-ink.png" alt=""></span></div>`,
  },
  {
    n: 18,
    kind: 'Product lockup',
    family: 'Programme',
    ground: 'photo-dim',
    why: 'Where a product is named. Lockup, one line, the meta — and a photograph dimmed far enough that the lockup is the brightest thing on the tile.',
    caption:
      'ODDfest 2027: Helsinki’s creative week, made of independently produced events across the city. Dates are not fixed yet — which is exactly why now is the moment to bring an idea.',
    html: `
      <img class="bleed dim" src="images/valerie-june.jpg" alt="">
      <div class="scrim full"></div>
      <div class="pad flow-center">
        <img class="lockup" src="images/oddfest-paper.png" alt="ODDfest">
        <p class="t-heading">Helsinki’s creative week, bringing cultural and creative scenes together.</p>
        <p class="eyebrow on-photo">Helsinki · 2027</p>
      </div>`,
  },
  {
    n: 19,
    kind: 'Named portrait',
    family: 'People',
    ground: 'ink',
    why: 'The one format that puts a name on a face — and only because the portrait came to us as that person’s portrait. Greyscale, name in Forta, role underneath.',
    caption:
      'Galit Ariel, techno-futurist and author, at ODDference 2026. ODDference 2027 is being built to be the same kind of room.',
    html: `
      <div class="portrait"><img src="images/galit-ariel.png" alt=""></div>
      <div class="pad bottom tight">
        <p class="eyebrow">ODDference 2026 · Past speaker</p>
        <p class="t-display">Galit Ariel</p>
        <p class="t-body muted">Techno-Futurist &amp; Author</p>
      </div>`,
  },
  {
    n: 20,
    kind: 'Quote',
    family: 'Voice',
    ground: 'ink',
    why: 'Quiet grey around the phrase that matters, attributed. Works for a thank-you, a talk, or a line from the room — never for a quote nobody said.',
    caption: 'For everyone who showed up, stayed late and made ODDfest 2026 real. Thank you.',
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">ODDfest 2026 · Thank you</p>
        <p class="t-display quote"><span class="quiet">“A hero is an ordinary individual who finds the strength to</span> persevere and endure <span class="quiet">in spite of overwhelming obstacles.”</span></p>
        <p class="eyebrow">— Christopher Reeve</p>
      </div>
      <div class="foot"><span>allthingsodd.co/oddfest-2026</span><span class="mark"><img src="images/odd-mark-paper.png" alt=""></span></div>`,
  },
];

/** 9:16 story frames — same system, one message each. */
export const stories = [
  {
    n: 1,
    kind: 'Doors',
    html: `
      <img class="bleed" src="images/crowd-hands.jpg" alt="">
      <div class="scrim"></div>
      <div class="pad-story bottom">
        <p class="eyebrow on-photo">Tonight · Vanha Ylioppilastalo</p>
        <p class="t-display">Doors at 19.</p>
      </div>`,
  },
  {
    n: 2,
    kind: 'Ask',
    ground: 'paper',
    html: `
      <div class="pad-story flow-center">
        <p class="eyebrow">Open call</p>
        <p class="t-hero">What should happen next?</p>
        <p class="t-body muted">Tell us — the sticker is right there.</p>
      </div>`,
  },
  {
    n: 3,
    kind: 'Credit',
    html: `
      <div class="pad-story flow-center">
        <p class="eyebrow">Last night</p>
        <p class="t-display">Made by <span class="quiet">@handle</span>, with ten collectives.</p>
        <p class="t-small muted">Photo: ODDfest</p>
      </div>`,
  },
];

/** A carousel reads as one composition: frame 1 states, 2–3 show, 4 asks. */
export const carousel = [
  {
    n: 1,
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">One night · ODDtheatre</p>
        <p class="t-hero">Ten collectives, one hall, no rehearsal.</p>
      </div>
      <div class="foot"><span>Swipe →</span><span class="mark"><img src="images/odd-mark-paper.png" alt=""></span></div>`,
  },
  {
    n: 2,
    html: `<img class="bleed" src="images/theatre-purple.jpg" alt=""><div class="scrim soft"></div>
      <div class="pad bottom tight"><p class="eyebrow on-photo">Directed by Tyre</p></div>`,
  },
  {
    n: 3,
    html: `<img class="bleed" src="images/oddspace-laughing.jpg" alt=""><div class="scrim soft"></div>
      <div class="pad bottom tight"><p class="eyebrow on-photo">The House of Xclusive Lanvin · Nuua Company · Wanda O’rly</p></div>`,
  },
  {
    n: 4,
    ground: 'paper',
    html: `
      <div class="pad flow-center">
        <p class="eyebrow">ODDfest 2027</p>
        <p class="t-display">Bring the thing only you would make.</p>
        <span class="pill-mock">Submit an event idea</span>
      </div>
      <div class="foot dark"><span>allthingsodd.co/oddfest</span><span class="mark"><img src="images/odd-mark-ink.png" alt=""></span></div>`,
  },
];

/** Highlight covers: one per pillar, the lockup suffix alone on Ink. */
export const highlights = ['FEST', 'FERENCE', 'SPACE', 'STUDIO', 'ARCHIVE', 'OPEN CALLS'];
