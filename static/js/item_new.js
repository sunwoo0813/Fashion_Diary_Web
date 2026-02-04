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
    wrap.style.display = 'block';
  });
})();
