// The four levels of a site walk, in the order a job runs. Each level is its own part of the site
// with its own crew and audit checkpoints. Nothing is locked: the levels are a guided path the
// visitor can follow or ignore. Rects are [minX, maxX, minZ, maxZ] in world metres.
export const LEVELS = [
  {
    number: 1, id: 'precon', title: 'Preconstruction', zone: 'Site office & front gate',
    crew: [1, 2], audits: ['bidding', 'kickoff'], extras: [],
    rects: [[-61.5, -24, 16.5, 34.5], [-24, 6, 28, 39.5]],
  },
  {
    number: 2, id: 'structure', title: 'Structure', zone: 'Main building',
    crew: [3, 4, 6], audits: ['scheduling', 'rfis'], extras: [],
    rects: [[-61.5, -8, -35, 1]],
  },
  {
    number: 3, id: 'field', title: 'Field operations', zone: 'Excavation & laydown yard',
    crew: [5, 9, 7], audits: ['visibility', 'field'], extras: [],
    rects: [[-3, 50, -35, -3], [46, 65, 6, 35]],
  },
  {
    number: 4, id: 'closeout', title: 'Closeout & cash', zone: 'Parking, food truck & site office',
    crew: [8, 10], audits: ['closeout'], extras: ['office', 'report'],
    rects: [[12, 44, 16.5, 39.5]],
  },
];

export const levelByNumber = (n) => LEVELS.find((l) => l.number === n) || null;

// Which level's part of the site a point is in (null in the open yard between them).
export function zoneAt(x, z) {
  const l = LEVELS.find((k) => k.rects.some(([a, b, c, d]) => x >= a && x <= b && z >= c && z <= d));
  return l ? l.number : null;
}

// 1 star for any progress, 2 for half the level, 3 for all of it.
export function starsFor(done, total) {
  if (done >= total) return 3;
  if (done * 2 >= total) return 2;
  return done > 0 ? 1 : 0;
}

export const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
