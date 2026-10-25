// The loading screen is already in index.html so there is never a blank first paint; this drives it.
export function createLoading(root) {
  const el = root.querySelector('.sw-loading');
  const bar = el.querySelector('.sw-loading-bar span');
  return {
    progress(p) { bar.style.width = `${Math.max(5, Math.round(p * 100))}%`; },
    hide() { el.hidden = true; },
    fail(text) { el.querySelector('.sw-loading-title').textContent = text; },
  };
}
