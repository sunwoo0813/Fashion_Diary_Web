/* 오늘 날씨 자동 입력 */
(function () {
  const btn = document.getElementById('fillWeather');
  const cityEl = document.getElementById('city');
  const tMinEl = document.getElementById('t_min');
  const tMaxEl = document.getElementById('t_max');
  const humEl = document.getElementById('humidity');
  const rainEl = document.getElementById('rain');
  const preview = document.getElementById('weatherPreview');

  if (!btn) return;

  btn.addEventListener('click', async () => {
    const city = (cityEl?.value || '서울').trim();
    btn.disabled = true;
    const prevText = btn.textContent;
    btn.textContent = '불러오는 중...';

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

      if (preview) {
        preview.style.display = 'block';
        preview.textContent = `도시 ${w.city} | ${w.desc} | ${w.t_min}°C ~ ${w.t_max}°C | 습도 ${w.humidity}% | ${w.rain ? '강수 가능' : '강수 없음'}`;
      }
    } catch (e) {
      console.error(e);
      alert('날씨 조회 중 오류가 발생했습니다.');
    } finally {
      btn.disabled = false;
      btn.textContent = prevText;
    }
  });
})();

/* 사진 미리보기 + 슬라이더 + 태그 */
(function () {
  const fileInput = document.querySelector('input[type="file"][name="photos"]');
  const wrap = document.getElementById('photoPreviewWrap');
  const imgEl = document.getElementById('photoPreviewImg');
  const prevBtn = document.getElementById('photoPrevBtn');
  const nextBtn = document.getElementById('photoNextBtn');
  const counter = document.getElementById('photoCounter');
  const thumbs = document.getElementById('photoThumbs');
  const tagPanel = document.getElementById('photoTagPanel');
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
      renderTags();
      return;
    }
    wrap.style.display = 'block';
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
      t.style.objectFit = 'cover';
      t.style.borderRadius = '12px';
      t.style.cursor = 'pointer';
      t.style.border = i === idx ? '2px solid var(--text)' : '1px solid var(--border)';
      t.addEventListener('click', () => {
        idx = i;
        render();
      });
      thumbs.appendChild(t);
    });
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
    formEl.addEventListener('submit', () => {
      syncHidden();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (wrap.style.display === 'none') return;
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
  });
})();
