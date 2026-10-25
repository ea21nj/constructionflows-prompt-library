// Picks how much the renderer should do, so phones and older laptops stay smooth.
const MOBILE = /iPhone|iPad|iPod|Android|Mobile/i;

export function detectTier({ ua = '', cores = 4, memory = 4, webgl2 = true } = {}) {
  if (!webgl2 || cores <= 2 || (memory && memory <= 2)) return 'low';
  if (MOBILE.test(ua)) return 'medium';
  return cores >= 8 ? 'high' : 'medium';
}

export function tierSettings(tier, dpr = 1) {
  if (tier === 'low') return { pixelRatio: 1, shadows: false, shadowMapSize: 0, post: false };
  if (tier === 'medium') return { pixelRatio: Math.min(dpr, 1.5), shadows: true, shadowMapSize: 2048, post: false };
  return { pixelRatio: Math.min(dpr, 2), shadows: true, shadowMapSize: 4096, post: true };
}

export function currentTier() {
  let webgl2 = false;
  try { webgl2 = !!document.createElement('canvas').getContext('webgl2'); } catch { /* none */ }
  return detectTier({ ua: navigator.userAgent, cores: navigator.hardwareConcurrency || 4, memory: navigator.deviceMemory || 4, webgl2 });
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}
