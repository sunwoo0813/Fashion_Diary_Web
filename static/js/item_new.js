(function () {
  const input = document.querySelector('input[type="file"][name="image"]');
  const wrap = document.getElementById('itemPhotoPreviewWrap');
  const img = document.getElementById('itemPhotoPreviewImg');
  const prefillImagePath = document.getElementById('imagePathPrefill');
  if (!input || !wrap || !img) return;

  let url = null;
  input.addEventListener('change', () => {
    if (url) URL.revokeObjectURL(url);
    const file = input.files && input.files[0];
    if (!file) {
      const prefill = (prefillImagePath?.value || '').trim();
      if (prefill) {
        img.src = prefill;
        wrap.style.display = 'flex';
      } else {
        wrap.style.display = 'none';
        img.removeAttribute('src');
      }
      return;
    }
    if (prefillImagePath) prefillImagePath.value = '';
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

(function () {
  const searchInput = document.getElementById('productSearchInput');
  const searchBtn = document.getElementById('productSearchBtn');
  const resultsWrap = document.getElementById('productSearchResults');
  if (!searchInput || !searchBtn || !resultsWrap) return;

  const brandInput = document.querySelector('input[name="brand"]');
  const productInput = document.querySelector('input[name="product"]');
  const categorySelect = document.querySelector('select[name="category"]');
  const fileInput = document.querySelector('input[type="file"][name="image"]');
  const prefillImagePath = document.getElementById('imagePathPrefill');
  const previewWrap = document.getElementById('itemPhotoPreviewWrap');
  const previewImg = document.getElementById('itemPhotoPreviewImg');

  let debounceTimer = null;
  let reqSeq = 0;

  function hideResults() {
    resultsWrap.style.display = 'none';
    resultsWrap.innerHTML = '';
  }

  function normalizeCategoryText(value) {
    return (value || '').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '');
  }

  function setCategory(value) {
    if (!categorySelect || !value) return;
    const options = Array.from(categorySelect.options || []);
    const exact = options.find((opt) => opt.value === value);
    if (exact) {
      categorySelect.value = exact.value;
      return;
    }

    const loose = options.find(
      (opt) => (opt.value || '').trim().toLowerCase() === value.trim().toLowerCase()
    );
    if (loose) {
      categorySelect.value = loose.value;
      return;
    }

    const normalized = normalizeCategoryText(value);
    if (!normalized) return;

    const categoryRules = [
      {
        value: 'Tops',
        keywords: ['top', 'tops', 'blouse', 'blouses', 'shirt', 'shirts', 'tee', 'tshirt', 'knit', 'sweater', '상의'],
      },
      {
        value: 'Outerwear',
        keywords: ['outerwear', 'outer', 'jacket', 'coat', 'padding', 'parka', 'jumper', 'cardigan', '아우터', '자켓', '코트', '점퍼'],
      },
      {
        value: 'Bottoms',
        keywords: ['bottom', 'bottoms', 'pants', 'pant', 'jean', 'jeans', 'trouser', 'trousers', 'skirt', 'shorts', '하의', '바지', '치마', '슬랙스'],
      },
      {
        value: 'Footwear',
        keywords: ['footwear', 'shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'loafer', 'loafers', 'sandals', '신발', '슈즈'],
      },
      {
        value: 'Accessories',
        keywords: ['accessory', 'accessories', 'acc', 'bag', 'bags', 'hat', 'hats', 'cap', 'caps', 'belt', 'jewelry', 'wallet', 'scarf', '악세서리', '액세서리', '가방', '모자'],
      },
    ];

    for (const rule of categoryRules) {
      const matched = rule.keywords.some((key) => normalized.includes(normalizeCategoryText(key)));
      if (!matched) continue;

      const mapped = options.find((opt) => opt.value === rule.value);
      if (mapped) {
        categorySelect.value = mapped.value;
        return;
      }
    }
  }

  function applyProduct(item) {
    if (productInput) productInput.value = item.name || '';
    if (brandInput) brandInput.value = item.brand || '';
    setCategory(item.category || '');

    if (prefillImagePath) prefillImagePath.value = item.image_path || '';
    if (fileInput) fileInput.value = '';
    if (previewWrap && previewImg) {
      if (item.image_path) {
        previewImg.src = item.image_path;
        previewWrap.style.display = 'flex';
      } else {
        previewWrap.style.display = 'none';
        previewImg.removeAttribute('src');
      }
    }
  }

  function renderResults(items) {
    resultsWrap.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'item-search-empty';
      empty.textContent = 'No matching products';
      resultsWrap.appendChild(empty);
      resultsWrap.style.display = 'block';
      return;
    }

    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'item-search-result';

      const thumb = document.createElement('div');
      thumb.className = 'item-search-thumb';
      if (item.image_path) {
        thumb.style.backgroundImage = `url(\"${item.image_path.replace(/\"/g, '\\\"')}\")`;
      }

      const meta = document.createElement('div');
      meta.className = 'item-search-meta';

      const name = document.createElement('p');
      name.className = 'item-search-name';
      name.textContent = item.name || 'Untitled product';

      const sub = document.createElement('p');
      sub.className = 'item-search-sub';
      const subParts = [item.brand, item.category, item.size_table].filter(Boolean);
      sub.textContent = subParts.join(' / ');

      meta.appendChild(name);
      meta.appendChild(sub);
      btn.appendChild(thumb);
      btn.appendChild(meta);
      btn.addEventListener('click', () => {
        applyProduct(item);
        searchInput.value = item.name || '';
        hideResults();
      });
      resultsWrap.appendChild(btn);
    });

    resultsWrap.style.display = 'block';
  }

  async function runSearch() {
    const q = (searchInput.value || '').trim();
    if (!q) {
      hideResults();
      return;
    }

    const currentReq = ++reqSeq;
    searchBtn.disabled = true;
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (currentReq !== reqSeq) return;
      if (!res.ok || !data.ok) throw new Error(data.error || 'Search failed');
      renderResults(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      resultsWrap.innerHTML = '';
      const error = document.createElement('div');
      error.className = 'item-search-empty';
      error.textContent = 'Product search failed';
      resultsWrap.appendChild(error);
      resultsWrap.style.display = 'block';
    } finally {
      searchBtn.disabled = false;
    }
  }

  searchBtn.addEventListener('click', runSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    } else if (e.key === 'Escape') {
      hideResults();
    }
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = (searchInput.value || '').trim();
    if (!q) {
      hideResults();
      return;
    }
    debounceTimer = setTimeout(runSearch, 220);
  });

  document.addEventListener('click', (e) => {
    if (resultsWrap.contains(e.target)) return;
    if (searchInput.contains(e.target)) return;
    if (searchBtn.contains(e.target)) return;
    hideResults();
  });
})();
