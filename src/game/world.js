// Builds the whole site from the asset packs and procedural parts, and animates what moves.
import * as THREE from 'three';
import { buildGround } from './world/ground.js';
import { placeModels, buildOffice, buildBuilding, buildExcavation, buildLaydown, buildParking } from './world/areas.js';

export function buildWorld(scene, assets, { reducedMotion = false } = {}) {
  const root = new THREE.Group(); root.name = 'site'; scene.add(root);
  buildGround(root, assets);
  placeModels(root, assets);
  const office = buildOffice(root, assets, { reducedMotion });
  const building = buildBuilding(root, assets);
  const excavation = buildExcavation(root, assets);
  buildLaydown(root, assets);
  buildParking(root, assets);
  return {
    root,
    officeDoor: office.door,
    officeMarker: office.marker,
    setOfficeOpen: office.setOpen,
    update(dt, t) { office.update(t); building.update(t); excavation.update(t); },
  };
}
