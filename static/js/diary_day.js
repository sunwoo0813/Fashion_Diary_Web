(function() {
  const container = document.querySelector('.diary-day');
  if (!container) return;

  let startX = 0;
  let startY = 0;

  container.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0 && container.dataset.next) {
      window.location.href = container.dataset.next;
    } else if (dx > 0 && container.dataset.prev) {
      window.location.href = container.dataset.prev;
    }
  }, { passive: true });
})();
