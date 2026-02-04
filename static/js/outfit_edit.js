(function () {
  const itemsEl = document.getElementById('fdWardrobeItemsData');
  const tagMapEl = document.getElementById('fdInitialTagMapData');
  let wardrobeItems = [];
  let initialTagMap = {};

  if (itemsEl && itemsEl.textContent) {
    try {
      wardrobeItems = JSON.parse(itemsEl.textContent);
    } catch (e) {
      console.warn('wardrobe items parse failed', e);
    }
  }
  if (tagMapEl && tagMapEl.textContent) {
    try {
      initialTagMap = JSON.parse(tagMapEl.textContent);
    } catch (e) {
      console.warn('initial tag map parse failed', e);
    }
  }

  const slider = document.querySelector('.fd-slider');
  if (!slider) return;

  const itemsById = new Map(wardrobeItems.map(i => [String(i.id), i]));

  const frame = slider.querySelector('.fd-slider-frame');
  const fileInput = document.querySelector('input[type="file"][name="photos"]');
  const prev = frame.querySelector('.fd-nav.prev');
  const next = frame.querySelector('.fd-nav.next');
  const delBtn = frame.querySelector('.fd-delete');
  const counter = frame.querySelector('.fd-counter');
  const empty = frame.querySelector('.fd-empty');
  const delWrap = document.getElementById('deletePhotoInputs');
  const tagChips = document.getElementById('editPhotoTagChips');
  const tagInput = document.getElementById('editPhotoTagInput');
  const tagResults = document.getElementById('editPhotoTagResults');
  const hiddenExisting = document.getElementById('photoTagsExistingJson');
  const hiddenNew = document.getElementById('photoTagsNewJson');
  let idx = 0;
  let tagsByPhotoId = {};
  let tagsByLocalKey = {};

  Object.keys(initialTagMap || {}).forEach((k) => {
    tagsByPhotoId[String(k)] = (initialTagMap[k] || []).map(x => parseInt(x, 10));
  });

  function fileKey(file) {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  function allSlides() {
    return Array.from(frame.querySelectorAll('.fd-slide'));
  }

  function currentInfo() {
    const slides = allSlides();
    const cur = slides[idx];
    if (!cur) return null;
    if (cur.dataset.photoId) {
      return { type: "existing", key: String(cur.dataset.photoId) };
    }
    if (cur.dataset.localKey) {
      return { type: "local", key: cur.dataset.localKey };
    }
    return null;
  }

  function getTagArray(info) {
    if (!info) return [];
    if (info.type === "existing") {
      if (!tagsByPhotoId[info.key]) tagsByPhotoId[info.key] = [];
      return tagsByPhotoId[info.key];
    }
    if (!tagsByLocalKey[info.key]) tagsByLocalKey[info.key] = [];
    return tagsByLocalKey[info.key];
  }

  function insertSlide(el) {
    const ref = frame.querySelector('.fd-nav.prev') || frame.querySelector('.fd-counter');
    if (ref) frame.insertBefore(el, ref);
    else frame.appendChild(el);
  }

  function syncHidden() {
    if (hiddenExisting) hiddenExisting.value = JSON.stringify(tagsByPhotoId);
    if (hiddenNew) {
      const files = Array.from(fileInput.files || []);
      const list = files.map(f => tagsByLocalKey[fileKey(f)] || []);
      hiddenNew.value = JSON.stringify(list);
    }
  }

  function renderTags() {
    if (!tagChips) return;
    const info = currentInfo();
    const ids = getTagArray(info);
    tagChips.innerHTML = "";
    ids.forEach((id) => {
      const item = itemsById.get(String(id));
      const label = item ? `${item.name} · ${item.category}` : `#${id}`;
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = label;
      const x = document.createElement("span");
      x.textContent = " ×";
      x.style.opacity = "0.7";
      chip.appendChild(x);
      chip.addEventListener("click", () => {
        removeTag(id);
      });
      tagChips.appendChild(chip);
    });
    syncHidden();
  }

  function addTag(id) {
    const info = currentInfo();
    if (!info) return;
    const arr = getTagArray(info);
    if (!arr.includes(id)) arr.push(id);
    renderTags();
  }

  function removeTag(id) {
    const info = currentInfo();
    if (!info) return;
    const arr = getTagArray(info);
    const filtered = arr.filter(x => String(x) !== String(id));
    if (info.type === "existing") tagsByPhotoId[info.key] = filtered;
    else tagsByLocalKey[info.key] = filtered;
    renderTags();
  }

  function renderResults() {
    if (!tagResults || !tagInput) return;
    const q = tagInput.value.trim().toLowerCase();
    if (!q) {
      tagResults.style.display = "none";
      tagResults.innerHTML = "";
      return;
    }
    const results = wardrobeItems.filter(it =>
      `${it.name} ${it.category}`.toLowerCase().includes(q)
    ).slice(0, 8);
    tagResults.innerHTML = "";
    if (!results.length) {
      const emptyEl = document.createElement("div");
      emptyEl.className = "text-muted small";
      emptyEl.textContent = "검??결과 ?�음";
      tagResults.appendChild(emptyEl);
    } else {
      results.forEach(it => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-soft btn-sm w-100 text-start mb-1";
        btn.textContent = `${it.name} · ${it.category}`;
        btn.addEventListener("click", () => {
          addTag(it.id);
          tagInput.value = "";
          renderResults();
        });
        tagResults.appendChild(btn);
      });
    }
    tagResults.style.display = "block";
  }

  function render() {
    const slides = allSlides();
    if (!slides.length) {
      if (empty) empty.style.display = 'flex';
      if (counter) counter.style.display = 'none';
      if (prev) prev.style.display = 'none';
      if (next) next.style.display = 'none';
      if (delBtn) delBtn.style.display = 'none';
      if (tagChips) tagChips.innerHTML = "";
      return;
    }

    if (empty) empty.style.display = 'none';
    if (counter) counter.style.display = 'block';
    if (prev) prev.style.display = 'inline-flex';
    if (next) next.style.display = 'inline-flex';
    if (delBtn) delBtn.style.display = 'inline-flex';

    if (idx >= slides.length) idx = slides.length - 1;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    if (counter) counter.textContent = `${idx + 1} / ${slides.length}`;
    if (prev) prev.disabled = (idx === 0);
    if (next) next.disabled = (idx === slides.length - 1);
    renderTags();
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const oldLocal = frame.querySelectorAll('.fd-slide[data-local-key]');
      oldLocal.forEach((el) => {
        const url = el.dataset.localUrl;
        if (url) URL.revokeObjectURL(url);
        el.remove();
      });
      tagsByLocalKey = {};

      const files = Array.from(fileInput.files || []);
      files.forEach((file) => {
        const url = URL.createObjectURL(file);
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        const img = document.createElement('img');
        img.className = 'fd-slide';
        img.dataset.localKey = key;
        img.dataset.localUrl = url;
        img.src = url;
        img.alt = 'outfit';
        insertSlide(img);
      });
      render();
    });
  }

  if (prev) prev.addEventListener('click', () => { if (idx > 0) { idx--; render(); } });
  if (next) next.addEventListener('click', () => {
    const slides = allSlides();
    if (idx < slides.length - 1) { idx++; render(); }
  });
  if (delBtn) delBtn.addEventListener('click', () => {
    const slides = allSlides();
    if (!slides.length) return;
    const current = slides[idx];
    if (!current) return;
    if (!confirm('???�진????��?�까??')) return;

    const pid = current.dataset.photoId;
    const localKey = current.dataset.localKey;
    const localUrl = current.dataset.localUrl;

    if (pid && delWrap) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'delete_photo_ids';
      input.value = pid;
      delWrap.appendChild(input);
      delete tagsByPhotoId[String(pid)];
    }

    if (localUrl) URL.revokeObjectURL(localUrl);
    current.remove();

    if (localKey && fileInput && fileInput.files) {
      try {
        const dt = new DataTransfer();
        Array.from(fileInput.files).forEach((file) => {
          const key = `${file.name}|${file.size}|${file.lastModified}`;
          if (key !== localKey) dt.items.add(file);
        });
        fileInput.files = dt.files;
      } catch (e) {
        console.warn('?�일 목록 갱신 ?�패', e);
      }
      delete tagsByLocalKey[localKey];
    }

    if (idx >= allSlides().length) idx = Math.max(allSlides().length - 1, 0);
    render();
  });

  if (tagInput) {
    tagInput.addEventListener("input", renderResults);
    tagInput.addEventListener("focus", renderResults);
  }
  document.addEventListener("click", (e) => {
    if (!tagResults || !tagInput) return;
    if (e.target !== tagInput && !tagResults.contains(e.target)) {
      tagResults.style.display = "none";
    }
  });

  const formEl = document.getElementById('outfitEditForm');
  if (formEl) {
    formEl.addEventListener('submit', () => {
      syncHidden();
    });
  }

  render();
})();
