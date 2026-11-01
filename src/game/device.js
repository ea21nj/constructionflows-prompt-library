// Which version of the site walk a visitor gets. A computer with a mouse or trackpad and a big screen
// gets the full-screen version with keyboard controls; phones and tablets get the simplified phone
// version. On a computer the Menu can switch to phone view (shown in a phone-shaped screen), and the
// choice is remembered. index.html makes the same first decision before the page paints.
export const DESKTOP_QUERY = '(hover: hover) and (pointer: fine) and (min-width: 1024px)';
const PREFS_KEY = 'wp.sitewalk.prefs';

export const canUseDesktop = () => !!window.matchMedia?.(DESKTOP_QUERY).matches;

export function decideView({ capable, saved }) {
  if (!capable) return { mode: 'phone', framed: false };
  return saved === 'phone' ? { mode: 'phone', framed: true } : { mode: 'desktop', framed: false };
}

export function applyView({ mode, framed }) {
  const c = document.documentElement.classList;
  c.toggle('sw-mode-desktop', mode === 'desktop');
  c.toggle('sw-mode-phone', mode === 'phone');
  c.toggle('sw-framed', !!framed);
}

export const viewMode = () => (document.documentElement.classList.contains('sw-mode-desktop') ? 'desktop' : 'phone');

export function savedView() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY))?.view; } catch { return undefined; }
}
export function saveView(view) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...(JSON.parse(localStorage.getItem(PREFS_KEY)) || {}), view })); } catch { /* storage unavailable */ }
}
