// True while the site walk is on screen (not the classic pages). Every game key handler checks this
// so the classic pages keep normal keyboard behaviour after someone has played.
export const gameActive = () => document.documentElement.classList.contains('site-walk-on');

export const typing = (e) => e.target?.closest?.('input, textarea, select, [contenteditable="true"]');
