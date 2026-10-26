// Real frame rate, averaged over a window, and the rule for stepping quality down.
const STEP_DOWN = { high: 'medium', medium: 'low' };

export function createFpsMeter(now = () => performance.now(), windowMs = 4000) {
  let times = [], since = null;
  return {
    frame() {
      const t = now();
      if (since === null) since = t;
      times.push(t);
      while (times.length && t - times[0] > windowMs) times.shift();
    },
    // Forget everything (after a pause, a hidden tab or a quality change).
    reset() { times = []; since = null; },
    // null until a whole window has passed since the last reset.
    fps() {
      if (since === null || times.length < 2) return null;
      const last = times[times.length - 1];
      if (last - since < windowMs * 0.95) return null;
      return ((times.length - 1) * 1000) / (last - times[0]);
    },
  };
}

// Step down one tier only after two slow readings in a row (one slow second is a hiccup).
export function nextTier(current, samples) {
  const [a, b] = samples.slice(-2);
  if (!STEP_DOWN[current] || a == null || b == null) return current;
  return a < 30 && b < 30 ? STEP_DOWN[current] : current;
}
