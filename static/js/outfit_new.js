/* 오늘 날씨 자동 입력 */
(function () {
  const btn = document.getElementById('fillWeather');
  const cityEl = document.getElementById('city');
  const tMinEl = document.getElementById('t_min');
  const tMaxEl = document.getElementById('t_max');
  const humEl = document.getElementById('humidity');
  const rainEl = document.getElementById('rain');
  const preview = document.getElementById('weatherPreview');
  const weatherTempEl = document.querySelector('.weather-temp');
  const weatherDescEl = document.querySelector('.weather-desc');

  if (!btn) return;

  btn.addEventListener('click', async () => {
    const city = (cityEl?.value || '').trim();
    if (!city) {
      alert('도시를 입력해 주세요.');
      cityEl?.focus();
      return;
    }
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');

    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      const j = await res.json();

      if (!j.ok) {
        alert(j.error || '날씨 정보를 불러오지 못했습니다.');
        return;
      }

      const w = j.data;

      if (tMinEl) tMinEl.value = w.t_min;
      if (tMaxEl) tMaxEl.value = w.t_max;
      if (humEl) humEl.value = w.humidity;
      if (rainEl) rainEl.value = w.rain ? '1' : '0';

      if (weatherTempEl) {
        weatherTempEl.textContent = `${w.t_max}°C / ${w.t_min}°C`;
      }
      if (weatherDescEl) {
        weatherDescEl.textContent = `도시 ${w.city}`;
      }

      if (preview) {
        preview.style.display = 'none';
        preview.textContent = '';
      }
    } catch (e) {
      console.error(e);
      alert('날씨 조회 중 오류가 발생했습니다.');
    } finally {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  });
})();

/* 사진 미리보기 + 슬라이더 + 태그 */
(function () {
  const fileInput = document.querySelector('input[type="file"][name="photos"]');
  const wrap = document.getElementById('photoPreviewWrap');
  const frameEl = wrap?.querySelector('.preview-frame');
  const imgEl = document.getElementById('photoPreviewImg');
  const prevBtn = document.getElementById('photoPrevBtn');
  const nextBtn = document.getElementById('photoNextBtn');
  const counter = document.getElementById('photoCounter');
  const thumbs = document.getElementById('photoThumbs');
  const tagPanel = document.getElementById('photoTagPanel');
  const tagSearchBtn = document.querySelector('.tag-search');
  const tagChips = document.getElementById('photoTagChips');
  const tagInput = document.getElementById('photoTagInput');
  const tagResults = document.getElementById('photoTagResults');
  const tagHidden = document.getElementById('photoTagsJson');
  const formEl = fileInput?.closest('form');

  const itemsEl = document.getElementById('fdWardrobeItemsData');
  let wardrobeItems = [];
  if (itemsEl && itemsEl.textContent) {
    try {
      wardrobeItems = JSON.parse(itemsEl.textContent);
    } catch (e) {
      console.warn('wardrobe items parse failed', e);
    }
  }
  const itemsById = new Map(wardrobeItems.map((i) => [String(i.id), i]));

  if (!fileInput) return;

  let urls = [];
  let idx = 0;
  let fileKeys = [];
  let tagsByKey = {};
  let isTagPanelOpen = false;

  function fileKey(file) {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  function currentKey() {
    return fileKeys[idx] || null;
  }

  function cleanup() {
    urls.forEach((u) => URL.revokeObjectURL(u));
    urls = [];
    fileKeys = [];
    tagsByKey = {};
    isTagPanelOpen = false;
  }

  function fitPreviewFrame() {
    if (!wrap || !frameEl || !imgEl || !thumbs) return;
    if (wrap.style.display === 'none') return;
    if (!imgEl.naturalWidth || !imgEl.naturalHeight) return;

    const style = window.getComputedStyle(wrap);
    const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const gap = parseFloat(style.rowGap || style.gap || '0') || 0;

    const maxW = wrap.clientWidth - padX;
    const maxH = wrap.clientHeight - padY - gap - (thumbs.offsetHeight || 0);
    if (maxW <= 0 || maxH <= 0) return;

    const ratio = imgEl.naturalWidth / imgEl.naturalHeight;
    let width = maxW;
    let height = width / ratio;

    if (height > maxH) {
      height = maxH;
      width = height * ratio;
    }

    frameEl.style.width = `${Math.max(120, Math.floor(width))}px`;
    frameEl.style.height = `${Math.max(120, Math.floor(height))}px`;
  }

  function syncHidden() {
    if (!tagHidden) return;
    const list = fileKeys.map((k) => tagsByKey[k] || []);
    tagHidden.value = JSON.stringify(list);
  }

  function renderTags() {
    if (!tagPanel || !tagChips) return;
    if (!urls.length) {
      tagPanel.style.display = 'none';
      tagChips.innerHTML = '';
      if (tagResults) {
        tagResults.style.display = 'none';
        tagResults.innerHTML = '';
      }
      isTagPanelOpen = false;
      return;
    }
    if (!isTagPanelOpen) {
      tagPanel.style.display = 'none';
      return;
    }
    tagPanel.style.display = 'block';
    const key = currentKey();
    const ids = key ? tagsByKey[key] || [] : [];
    tagChips.innerHTML = '';
    ids.forEach((id) => {
      const item = itemsById.get(String(id));
      const label = item ? `${item.name} · ${item.category}` : `#${id}`;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = label;
      const x = document.createElement('span');
      x.textContent = ' ×';
      x.style.opacity = '0.7';
      chip.appendChild(x);
      chip.addEventListener('click', () => {
        removeTag(id);
      });
      tagChips.appendChild(chip);
    });
    syncHidden();
  }

  function addTag(id) {
    const key = currentKey();
    if (!key) return;
    if (!tagsByKey[key]) tagsByKey[key] = [];
    if (!tagsByKey[key].includes(id)) {
      tagsByKey[key].push(id);
    }
    renderTags();
  }

  function removeTag(id) {
    const key = currentKey();
    if (!key || !tagsByKey[key]) return;
    tagsByKey[key] = tagsByKey[key].filter((x) => String(x) !== String(id));
    renderTags();
  }

  function renderResults() {
    if (!tagResults || !tagInput) return;
    const q = tagInput.value.trim().toLowerCase();
    if (!q) {
      tagResults.style.display = 'none';
      tagResults.innerHTML = '';
      return;
    }
    const results = wardrobeItems
      .filter((it) => `${it.name} ${it.category}`.toLowerCase().includes(q))
      .slice(0, 8);
    tagResults.innerHTML = '';
    if (!results.length) {
      const empty = document.createElement('div');
      empty.className = 'text-muted small';
      empty.textContent = '검색 결과 없음';
      tagResults.appendChild(empty);
    } else {
      results.forEach((it) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-soft btn-sm w-100 text-start mb-1';
        btn.textContent = `${it.name} · ${it.category}`;
        btn.addEventListener('click', () => {
          addTag(it.id);
          tagInput.value = '';
          renderResults();
        });
        tagResults.appendChild(btn);
      });
    }
    tagResults.style.display = 'block';
  }

  function render() {
    if (!urls.length) {
      wrap.style.display = 'none';
      if (frameEl) {
        frameEl.style.removeProperty('width');
        frameEl.style.removeProperty('height');
      }
      renderTags();
      return;
    }
    wrap.style.display = 'flex';
    if (frameEl) {
      frameEl.style.removeProperty('width');
      frameEl.style.removeProperty('height');
    }
    imgEl.src = urls[idx];
    counter.textContent = `${idx + 1} / ${urls.length}`;

    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === urls.length - 1;

    thumbs.innerHTML = '';
    urls.forEach((u, i) => {
      const t = document.createElement('img');
      t.src = u;
      t.alt = `thumb-${i}`;
      t.style.width = '72px';
      t.style.height = '72px';
      t.style.objectFit = 'contain';
      t.style.background = '#f1f1f1';
      t.style.borderRadius = '12px';
      t.style.cursor = 'pointer';
      t.style.border = i === idx ? '2px solid var(--text)' : '1px solid var(--border)';
      t.addEventListener('click', () => {
        idx = i;
        render();
      });
      thumbs.appendChild(t);
    });
    fitPreviewFrame();
    renderTags();
  }

  fileInput.addEventListener('change', () => {
    cleanup();
    const files = Array.from(fileInput.files || []);
    if (!files.length) return render();

    urls = files.map((f) => URL.createObjectURL(f));
    fileKeys = files.map(fileKey);
    idx = 0;
    render();
  });

  if (tagSearchBtn) {
    tagSearchBtn.addEventListener('click', () => {
      if (!urls.length) {
        alert('먼저 사진을 업로드해 주세요.');
        fileInput.focus();
        return;
      }
      isTagPanelOpen = true;
      renderTags();
      if (tagInput) {
        tagInput.focus();
        renderResults();
      }
    });
  }

  prevBtn.addEventListener('click', () => {
    if (idx > 0) {
      idx--;
      render();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (idx < urls.length - 1) {
      idx++;
      render();
    }
  });

  if (tagInput) {
    tagInput.addEventListener('input', renderResults);
    tagInput.addEventListener('focus', renderResults);
  }
  document.addEventListener('click', (e) => {
    if (!tagResults || !tagInput) return;
    if (e.target !== tagInput && !tagResults.contains(e.target)) {
      tagResults.style.display = 'none';
    }
  });

  if (formEl) {
    formEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const target = e.target;
      if (target instanceof HTMLElement && target.tagName === 'TEXTAREA') return;
      e.preventDefault();
    });
    formEl.addEventListener('submit', () => {
      syncHidden();
    });
  }

  imgEl.addEventListener('load', fitPreviewFrame);
  window.addEventListener('resize', fitPreviewFrame);

  window.addEventListener('keydown', (e) => {
    if (wrap.style.display === 'none') return;
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
  });
})();




