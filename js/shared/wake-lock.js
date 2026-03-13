// Keep screen awake while playing, release after 60s idle
(async () => {
  if (!('wakeLock' in navigator)) return;
  let lock = null;
  let idleTimer = null;

  async function acquire() {
    if (lock) return;
    try { lock = await navigator.wakeLock.request('screen'); }
    catch { /* user denied or not supported */ }
  }

  function release() {
    if (lock) { lock.release(); lock = null; }
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    acquire();
    idleTimer = setTimeout(release, 60000);
  }

  ['pointerdown', 'pointermove', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, resetIdle, { passive: true })
  );

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resetIdle();
    else release();
  });

  resetIdle();
})();
