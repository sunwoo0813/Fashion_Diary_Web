(function () {
  const dataEl = document.getElementById('fdTagMapData');
  let tagMap = {};
  if (dataEl && dataEl.textContent) {
    try {
      tagMap = JSON.parse(dataEl.textContent);
    } catch (e) {
      console.warn('tag map parse failed', e);
    }
  }

  const sliders = document.querySelectorAll('.fd-slider');
  sliders.forEach((slider) => {
    const slides = slider.querySelectorAll('.fd-slide');
    if (!slides.length) return;

    const prev = slider.querySelector('.fd-nav.prev');
    const next = slider.querySelector('.fd-nav.next');
    const counter = slider.querySelector('.fd-counter');
    let idx = 0;

    function render() {
      slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      if (counter) counter.textContent = `${idx + 1} / ${slides.length}`;
      if (prev) prev.disabled = (idx === 0);
      if (next) next.disabled = (idx === slides.length - 1);

      const current = slides[idx];
      const pid = current?.dataset?.photoId;
      const card = slider.closest('.card-clean');
      const tagWrap = card ? card.querySelector('.fd-photo-tags') : null;
      if (tagWrap) {
        const tags = (pid && tagMap[pid]) ? tagMap[pid] : [];
        if (tags && tags.length) {
          tagWrap.innerHTML = '<div class="d-flex flex-wrap gap-2">' +
            tags.map(t => `<span class="chip">${t.name}</span>`).join('') +
            '</div>';
        } else {
          tagWrap.innerHTML = '<div class="ghost">?úÍ∑∏???∑Ïù¥ ?ÜÏñ¥??</div>';
        }
      }
    }

    if (prev) prev.addEventListener('click', () => { if (idx > 0) { idx--; render(); } });
    if (next) next.addEventListener('click', () => { if (idx < slides.length - 1) { idx++; render(); } });

    render();
  });
})();
