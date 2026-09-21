// Three editions of the profile — a quarter, twelve tiles each, newest first, as
// Instagram lays them out (top-left is the latest post, so the panorama in
// edition 1 is posted c, b, a).
//
// Every edition: Ink by default, light on the diagonal 3 → 8 → 10 (a light
// photograph counts as light), at least seven photographs, one loud figure,
// one or two strikes, one numbered tile, the pill alone once a quarter. Any
// three consecutive tiles must still compose on their own.
export const editions = [
  // 1 — the room across the top, then the signature one device at a time.
  [
    'post-01a',
    'post-01b',
    'post-01c',
    'post-37',
    'post-02',
    'post-50',
    'post-17',
    'post-38',
    'post-13',
    'post-25',
    'post-04',
    'post-16',
  ],
  // 2 — three nights stacked, the highlights, the portrait series begins.
  [
    'post-24',
    'post-03',
    'post-44',
    'post-39',
    'post-26',
    'post-33',
    'post-07',
    'post-40',
    'post-14',
    'post-55',
    'post-46',
    'post-21',
  ],
  // 3 — the launch group, one lobe, the rooms, the mark breathing.
  [
    'post-11',
    'post-23',
    'post-47',
    'post-41',
    'post-27',
    'post-05',
    'post-19',
    'post-49',
    'post-15',
    'post-57',
    'post-28',
    'post-42',
  ],
];

export const grid = editions[0];
