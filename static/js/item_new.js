(function () {
  const input = document.querySelector('input[type="file"][name="image"]');
  const wrap = document.getElementById('itemPhotoPreviewWrap');
  const img = document.getElementById('itemPhotoPreviewImg');
  const prefillImagePath = document.getElementById('imagePathPrefill');
  const uploadCard = wrap?.closest('.upload-card');
  if (!input || !wrap || !img) return;

  const PREVIEW_GAP = 8;
  let url = null;

  function clearPreviewSize() {
    wrap.style.removeProperty('width');
    wrap.style.removeProperty('height');
  }

  function fitPreviewBox() {
    if (!uploadCard) return;
    if (wrap.style.display === 'none') return;
    if (!img.naturalWidth || !img.naturalHeight) return;

    const maxW = uploadCard.clientWidth - PREVIEW_GAP * 2;
    const maxH = uploadCard.clientHeight - PREVIEW_GAP * 2;
    if (maxW <= 0 || maxH <= 0) return;

    const ratio = img.naturalWidth / img.naturalHeight;
    let height = maxH;
    let width = height * ratio;

    if (width > maxW) {
      width = maxW;
      height = width / ratio;
    }

    wrap.style.width = `${width}px`;
    wrap.style.height = `${height}px`;
  }

  input.addEventListener('change', () => {
    if (url) URL.revokeObjectURL(url);
    const file = input.files && input.files[0];
    if (!file) {
      const prefill = (prefillImagePath?.value || '').trim();
      if (prefill) {
        clearPreviewSize();
        img.src = prefill;
        wrap.style.display = 'flex';
        if (img.complete) fitPreviewBox();
      } else {
        wrap.style.display = 'none';
        img.removeAttribute('src');
        clearPreviewSize();
      }
      return;
    }
    if (prefillImagePath) prefillImagePath.value = '';
    url = URL.createObjectURL(file);
    clearPreviewSize();
    img.src = url;
    wrap.style.display = 'flex';
    if (img.complete) fitPreviewBox();
  });

  img.addEventListener('load', fitPreviewBox);
  window.addEventListener('resize', fitPreviewBox);
})();

(function () {
  const searchInput = document.getElementById('productSearchInput');
  const searchBtn = document.getElementById('productSearchBtn');
  const resultsWrap = document.getElementById('productSearchResults');
  if (!searchInput || !searchBtn || !resultsWrap) return;

  const brandInput = document.querySelector('input[name="brand"]');
  const productInput = document.querySelector('input[name="product"]');
  const categorySelect = document.querySelector('select[name="category"]');
  const sizeInput = document.getElementById('sizeInput');
  const sizeDetailInput = document.getElementById('sizeDetailJson');
  const sizeOptionWrap = document.getElementById('sizeOptionWrap');
  const sizeOptionButtons = document.getElementById('sizeOptionButtons');
  const sizeTablePreviewWrap = document.getElementById('sizeTablePreviewWrap');
  const sizeTableHead = document.getElementById('sizeTableHead');
  const sizeTableBody = document.getElementById('sizeTableBody');
  const fileInput = document.querySelector('input[type="file"][name="image"]');
  const prefillImagePath = document.getElementById('imagePathPrefill');
  const previewWrap = document.getElementById('itemPhotoPreviewWrap');
  const previewImg = document.getElementById('itemPhotoPreviewImg');

  let debounceTimer = null;
  let reqSeq = 0;
  let sizeGuide = null;

  function hideResults() {
    resultsWrap.style.display = 'none';
    resultsWrap.innerHTML = '';
  }

  function setSizeDetail(value) {
    if (!sizeDetailInput) return;
    if (!value) {
      sizeDetailInput.value = '';
      return;
    }
    try {
      sizeDetailInput.value = JSON.stringify(value);
    } catch (e) {
      sizeDetailInput.value = '';
    }
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

  function normalizeSizeTable(headers, rows) {
    const head = (headers || []).map((v) => String(v ?? '').trim());
    const body = (rows || []).map((row) => (Array.isArray(row) ? row : [row]).map((v) => String(v ?? '').trim()));
    const width = Math.max(head.length, ...body.map((row) => row.length), 0);
    if (width < 1 || !body.length) return null;

    const normalizedHeaders = Array.from({ length: width }, (_, idx) => head[idx] || `COL ${idx + 1}`);
    const normalizedRows = body
      .map((row) => {
        const out = Array.from({ length: width }, (_, idx) => row[idx] || '');
        return out;
      })
      .filter((row) => row.some((cell) => cell));

    if (!normalizedRows.length) return null;
    return { headers: normalizedHeaders, rows: normalizedRows };
  }

  function splitSizeTableLine(line) {
    const text = String(line || '').trim();
    if (!text) return [];

    const delimiters = ['\t', '|', ',', '/', ';'];
    let best = [];
    for (const delimiter of delimiters) {
      if (!text.includes(delimiter)) continue;
      const parts = text.split(delimiter).map((part) => part.trim()).filter(Boolean);
      if (parts.length > best.length) best = parts;
    }
    if (best.length > 1) return best;

    const byWideSpace = text.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
    if (byWideSpace.length > 1) return byWideSpace;

    const bySpace = text.split(/\s+/).map((part) => part.trim()).filter(Boolean);
    if (bySpace.length > 1) return bySpace;

    return [text];
  }

  function parseStructuredSizeTable(data) {
    if (Array.isArray(data)) {
      if (!data.length) return null;
      if (Array.isArray(data[0])) {
        return normalizeSizeTable(data[0], data.slice(1));
      }
      if (typeof data[0] === 'object' && data[0] !== null) {
        const headers = Object.keys(data[0]);
        const rows = data.map((row) => headers.map((header) => row[header]));
        return normalizeSizeTable(headers, rows);
      }
      return null;
    }

    if (typeof data !== 'object' || data === null) return null;

    const rawHeaders = data.headers || data.columns || data.header;
    const rawRows = data.rows || data.data || data.values;
    if (Array.isArray(rawHeaders) && Array.isArray(rawRows)) {
      if (!rawRows.length) return null;
      if (Array.isArray(rawRows[0])) {
        return normalizeSizeTable(rawHeaders, rawRows);
      }
      if (typeof rawRows[0] === 'object' && rawRows[0] !== null) {
        const rows = rawRows.map((row) => rawHeaders.map((header) => row[header]));
        return normalizeSizeTable(rawHeaders, rows);
      }
    }

    const objKeys = Object.keys(data);
    if (objKeys.length) {
      const firstVal = data[objKeys[0]];
      if (typeof firstVal === 'object' && firstVal !== null && !Array.isArray(firstVal)) {
        const tailHeaders = Object.keys(firstVal);
        const headers = ['size', ...tailHeaders];
        const rows = objKeys.map((key) => [key, ...tailHeaders.map((header) => data[key]?.[header])]);
        return normalizeSizeTable(headers, rows);
      }
      if (Array.isArray(firstVal)) {
        const maxLen = Math.max(...objKeys.map((key) => (Array.isArray(data[key]) ? data[key].length : 0)), 0);
        const headers = ['size', ...Array.from({ length: maxLen }, (_, idx) => `value_${idx + 1}`)];
        const rows = objKeys.map((key) => [key, ...(Array.isArray(data[key]) ? data[key] : [])]);
        return normalizeSizeTable(headers, rows);
      }
      if (typeof firstVal !== 'object') {
        const headers = ['size', 'value'];
        const rows = objKeys.map((key) => [key, data[key]]);
        return normalizeSizeTable(headers, rows);
      }
    }
    return null;
  }

  function parseSizeTable(rawValue) {
    if (rawValue && typeof rawValue === 'object') {
      return parseStructuredSizeTable(rawValue);
    }

    const raw = String(rawValue || '').trim();
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      const jsonTable = parseStructuredSizeTable(parsed);
      if (jsonTable) return jsonTable;
    } catch (e) {
      // Not JSON; continue with text parsing.
    }

    const normalizedRaw = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .trim();

    const lines = normalizedRaw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 1) {
      const single = splitSizeTableLine(lines[0]);
      if (single.length > 1) {
        return normalizeSizeTable(['Size'], single.map((value) => [value]));
      }
      return null;
    }
    if (lines.length < 2) return null;

    const rows = lines.map(splitSizeTableLine).filter((row) => row.length);
    if (rows.length < 2) return null;
    return normalizeSizeTable(rows[0], rows.slice(1));
  }

  function resetSizeGuide() {
    sizeGuide = null;
    if (sizeOptionButtons) sizeOptionButtons.innerHTML = '';
    if (sizeOptionWrap) sizeOptionWrap.style.display = 'none';
    if (sizeTableHead) sizeTableHead.innerHTML = '';
    if (sizeTableBody) sizeTableBody.innerHTML = '';
    if (sizeTablePreviewWrap) sizeTablePreviewWrap.style.display = 'none';
    setSizeDetail(null);
  }

  function renderSizeGuideRow(rowIndex) {
    if (!sizeGuide) return;
    const row = sizeGuide.rows[rowIndex];
    if (!row) return;

    const headers = sizeGuide.headers.map((header) => String(header || '').trim());
    const values = headers.map((_, idx) => String(row[idx] || '').trim());
    if (sizeInput) sizeInput.value = values[0] || '';

    const pairs = {};
    headers.forEach((header, idx) => {
      pairs[header || `col_${idx + 1}`] = values[idx] || '';
    });
    setSizeDetail({
      headers,
      values,
      pairs,
    });

    if (sizeOptionButtons) {
      const buttons = Array.from(sizeOptionButtons.querySelectorAll('.size-option-btn'));
      buttons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.rowIndex === String(rowIndex));
      });
    }

    if (!sizeTableHead || !sizeTableBody || !sizeTablePreviewWrap) return;
    sizeTableHead.innerHTML = '';
    sizeTableBody.innerHTML = '';

    const headerRow = document.createElement('tr');
    headers.forEach((header) => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    sizeTableHead.appendChild(headerRow);

    const bodyRow = document.createElement('tr');
    headers.forEach((_, idx) => {
      const td = document.createElement('td');
      td.textContent = values[idx] || '';
      bodyRow.appendChild(td);
    });
    sizeTableBody.appendChild(bodyRow);
    sizeTablePreviewWrap.style.display = 'block';
  }

  function renderSizeGuide(table) {
    sizeGuide = table;
    if (!sizeOptionButtons || !sizeOptionWrap) return;

    sizeOptionButtons.innerHTML = '';
    if (sizeTableHead) sizeTableHead.innerHTML = '';
    if (sizeTableBody) sizeTableBody.innerHTML = '';
    if (sizeTablePreviewWrap) sizeTablePreviewWrap.style.display = 'none';

    table.rows.forEach((row, rowIndex) => {
      const key = String(row[0] || '').trim();
      if (!key) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'size-option-btn';
      button.dataset.rowIndex = String(rowIndex);
      button.textContent = key;
      button.addEventListener('click', () => {
        renderSizeGuideRow(rowIndex);
      });
      sizeOptionButtons.appendChild(button);
    });

    if (!sizeOptionButtons.children.length) {
      resetSizeGuide();
      return;
    }

    sizeOptionWrap.style.display = 'block';
  }

  function applyProduct(item) {
    if (productInput) productInput.value = item.name || '';
    if (brandInput) brandInput.value = item.brand || '';
    setCategory(item.category || '');
    resetSizeGuide();

    const parsedSizeTable = parseSizeTable(item.size_table);
    if (parsedSizeTable) {
      if (sizeInput) sizeInput.value = '';
      renderSizeGuide(parsedSizeTable);
    } else {
      if (sizeInput) sizeInput.value = item.size_table || '';
    }

    if (prefillImagePath) prefillImagePath.value = item.image_path || '';
    if (fileInput) fileInput.value = '';
    if (previewWrap && previewImg) {
      if (item.image_path) {
        previewWrap.style.removeProperty('width');
        previewWrap.style.removeProperty('height');
        previewImg.src = item.image_path;
        previewWrap.style.display = 'flex';
      } else {
        previewWrap.style.display = 'none';
        previewImg.removeAttribute('src');
        previewWrap.style.removeProperty('width');
        previewWrap.style.removeProperty('height');
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
      const subParts = [item.brand, item.category].filter(Boolean);
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

  if (sizeInput) {
    sizeInput.addEventListener('input', () => {
      setSizeDetail(null);
      if (sizeOptionButtons) {
        const buttons = Array.from(sizeOptionButtons.querySelectorAll('.size-option-btn'));
        buttons.forEach((button) => button.classList.remove('is-active'));
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (resultsWrap.contains(e.target)) return;
    if (searchInput.contains(e.target)) return;
    if (searchBtn.contains(e.target)) return;
    hideResults();
  });
})();
