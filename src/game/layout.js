// Where everything on site goes. The world (world.js) places these and collision (collision.js)
// blocks them, so what you see is exactly what you bump into.
// size is the footprint [width along x, depth along z] before rotation; rot is 0 or a quarter turn.
// Small props (cones, buckets, barrels) are walk-through and live in world.js only.

const Q = Math.PI / 2;

// Steel frame of the main building: 5 × 4 column grid.
export const COLUMN_X = [-57, -46.5, -36, -25.5, -15];
export const COLUMN_Z = [-30, -22, -14, -6];
export const COLUMN_SIZE = 0.45;

// Crane model's mast sits off-centre in its file: local base centre (3.5, -6.4).
export const CRANE = { at: [-4.5, -13.5], modelOffset: [3.5, -6.4], base: 4.6 };

export const PLACEMENTS = [
  // Site office compound
  { id: 'office', model: 'office_stack', at: [-43.5, 26.7], rot: 0, size: [11.5, 8.1] },
  { id: 'office_annex', model: 'container_office', at: [-53.5, 26.7], rot: Q, size: [3.0, 7.0] },
  { id: 'toilet_1', model: 'toilet', at: [-59.2, 19], rot: 0, size: [1.3, 1.3] },
  { id: 'toilet_2', model: 'toilet', at: [-57.6, 19], rot: 0, size: [1.3, 1.3] },
  { id: 'safety_tent', proc: 'tent', at: [-31.5, 31.5], rot: 0, size: [4, 3] },
  { id: 'plan_table', proc: 'plan_table', at: [-31.8, 19.5], rot: 0, size: [1.2, 2.2] },
  { id: 'office_fuel', model: 'fuel_tank', at: [-60.5, 32], rot: Q, size: [2.0, 4.3] },

  // Main building (columns are added separately from the grid)
  { id: 'wall_north', proc: 'cmu_wall', at: [-49, -31.6], rot: 0, size: [18, 0.4] },
  { id: 'wall_west', proc: 'cmu_wall', at: [-58.4, -23], rot: Q, size: [14, 0.4] },
  { id: 'scaffold_1', model: 'scaffolding', at: [-52, -1.6], rot: Q, size: [2.0, 4.9] },
  { id: 'scaffold_2', model: 'scaffolding', at: [-41, -1.6], rot: Q, size: [2.0, 4.9] },
  { id: 'scaffold_3', model: 'scaffolding', at: [-30, -1.6], rot: Q, size: [2.0, 4.9] },
  { id: 'steel_stack', proc: 'steel_stack', at: [-20, -31.5], rot: 0, size: [6.4, 1.6] },
  { id: 'crane_base', proc: 'crane_base', at: CRANE.at, rot: 0, size: [CRANE.base, CRANE.base] },
  { id: 'concrete_truck', model: 'concrete_truck', at: [-7, -24], rot: 0, size: [3.1, 7.2] },

  // Excavation
  { id: 'excavator', proc: 'excavator', at: [36, -21], rot: 0, size: [4.6, 3.4] },
  { id: 'spoil_pile', proc: 'spoil_pile', at: [43, -11], rot: 0, size: [6, 5] },
  { id: 'dump_truck', model: 'dump_truck', at: [17, -27], rot: 0, size: [3.1, 7.0] },
  { id: 'excavation_skip', model: 'skip', at: [11, -8.5], rot: 0, size: [5.5, 2.8] },

  // Laydown yard
  { id: 'block_row_1', proc: 'pallet_row', at: [55.5, 10.5], rot: 0, size: [12, 1.4] },
  { id: 'block_row_2', proc: 'pallet_row', at: [55.5, 14], rot: 0, size: [12, 1.4] },
  { id: 'delivery_truck', model: 'small_truck', at: [52, 19], rot: Q, size: [2.9, 5.6] },
  { id: 'cargo_container', model: 'container_shipping', at: [61.5, 29.5], rot: 0, size: [3.0, 8.4] },
  { id: 'pipe_stack', proc: 'pipe_stack', at: [51, 30], rot: 0, size: [6.2, 1.4] },
  { id: 'laydown_skip', model: 'skip_red', at: [61.6, 19], rot: 0, size: [1.7, 4.0] },

  // Parking + food truck
  { id: 'food_truck', proc: 'food_truck', at: [30.5, 27], rot: Q, size: [2.9, 5.6] },
  { id: 'picnic_1', proc: 'picnic_table', at: [17, 32.8], rot: 0, size: [1.8, 1.6] },
  { id: 'picnic_2', proc: 'picnic_table', at: [21, 32.8], rot: 0, size: [1.8, 1.6] },
  { id: 'picnic_3', proc: 'picnic_table', at: [25, 32.8], rot: 0, size: [1.8, 1.6] },
  { id: 'pickup_1', model: 'small_truck', at: [14, 20], rot: 0, size: [2.9, 5.6] },
  { id: 'pickup_2', model: 'small_truck', at: [39.5, 31], rot: 0, size: [2.9, 5.6] },
];

// Axis-aligned footprint [minX, maxX, minZ, maxZ] of a placement.
export function footprint({ at: [x, z], rot = 0, size: [w, d] }) {
  const quarter = Math.round(rot / Q) % 2 !== 0;
  const hw = (quarter ? d : w) / 2, hd = (quarter ? w : d) / 2;
  return [x - hw, x + hw, z - hd, z + hd];
}
