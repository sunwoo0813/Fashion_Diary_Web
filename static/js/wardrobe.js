(function () {
  const toggleBtn = document.getElementById('deleteToggleBtn');
  const hint = document.getElementById('deleteHint');
  const form = document.getElementById('itemDeleteForm');
  const items = Array.from(document.querySelectorAll('.wardrobe-item'));
  if (!toggleBtn || !items.length || !form) return;

  let deleteMode = false;

  function selectedIds() {
    return items.filter((i) => i.classList.contains('selected')).map((i) => i.dataset.itemId);
  }

  function updateUI() {
    const count = selectedIds().length;
    if (hint) hint.style.display = deleteMode ? 'block' : 'none';
    if (!deleteMode) {
      toggleBtn.textContent = '삭제';
      return;
    }
    toggleBtn.textContent = count > 0 ? '선택 삭제' : '삭제 취소';
  }

  toggleBtn.addEventListener('click', () => {
    if (!deleteMode) {
      deleteMode = true;
      updateUI();
      return;
    }

    const ids = selectedIds();
    if (!ids.length) {
      deleteMode = false;
      items.forEach((i) => i.classList.remove('selected'));
      updateUI();
      return;
    }
    if (!confirm(`선택한 ${ids.length}개를 삭제할까요?`)) return;

    form.innerHTML = '';
    ids.forEach((id) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'item_ids';
      input.value = id;
      form.appendChild(input);
    });
    form.submit();
  });

  items.forEach((el) => {
    el.addEventListener('click', (e) => {
      if (!deleteMode) return;
      e.preventDefault();
      el.classList.toggle('selected');
      updateUI();
    });
  });

  updateUI();
})();
