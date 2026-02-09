(function () {
  const input = document.querySelector('input[type="file"][name="image"]');
  const wrap = document.getElementById('itemPhotoPreviewWrap');
  const img = document.getElementById('itemPhotoPreviewImg');
  if (!input || !wrap || !img) return;

  let url = null;
  input.addEventListener('change', () => {
    if (url) URL.revokeObjectURL(url);
    const file = input.files && input.files[0];
    if (!file) {
      wrap.style.display = 'none';
      img.removeAttribute('src');
      return;
    }
    url = URL.createObjectURL(file);
    img.src = url;
    wrap.style.display = 'flex';
  });
})();

(function () {
  const colorInput = document.getElementById('colorInput');
  const swatches = document.querySelectorAll('[data-color]');
  if (!colorInput || !swatches.length) return;

  const active = document.querySelector('[data-color].is-active');
  if (active && !colorInput.value) {
    colorInput.value = active.dataset.color || '';
  }

  swatches.forEach((btn) => {
    btn.addEventListener('click', () => {
      swatches.forEach((el) => el.classList.remove('is-active'));
      btn.classList.add('is-active');
      colorInput.value = btn.dataset.color || '';
    });
  });
})();
