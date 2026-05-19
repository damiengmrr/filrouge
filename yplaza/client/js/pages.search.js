document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search-form');
  const resultsContainer = document.getElementById('results-container');
  const errorBox = document.getElementById('search-error');
  const paginationInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const resetBtn = document.getElementById('reset-filters');
  const resultsCount = document.getElementById('results-count');
  const searchTitle = document.getElementById('search-title');
  const searchLead = document.getElementById('search-lead');

  let currentPage = 1;
  let currentLimit = 9;
  let total = 0;

  const urlParams = new URLSearchParams(window.location.search);
  const initialMode = urlParams.get('mode') || '';
  const initialCity = urlParams.get('city') || '';

  const modeField = document.getElementById('mode');
  const cityField = document.getElementById('city');

  if (modeField && initialMode) modeField.value = initialMode;
  if (cityField && initialCity) cityField.value = initialCity;

  function updatePageText() {
    const mode = modeField?.value || '';

    if (mode === 'buy') {
      searchTitle.textContent = 'Acheter un bien';
      searchLead.textContent =
        'Parcourez les biens à vendre avec une recherche simple, lisible et efficace.';
    } else if (mode === 'rent') {
      searchTitle.textContent = 'Louer un bien';
      searchLead.textContent =
        'Retrouvez les biens disponibles à la location avec des filtres clairs.';
    } else {
      searchTitle.textContent = 'Recherche immobilière';
      searchLead.textContent =
        'Affinez vos critères et consultez des annonces bien présentées, avec visuels et informations utiles.';
    }
  }

  function normalizeOfferValue(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function propertyMatchesMode(property, mode) {
    if (!mode) return true;

    const normalizedMode = normalizeOfferValue(mode);
    const valuesToCheck = [
      property.offer_type,
      property.offerType,
      property.transaction_type,
      property.transactionType,
      property.transaction,
      property.listing_type,
      property.listingType,
      property.operation,
      property.purpose,
      property.mode,
      property.category,
      property.status_label,
      property.statusLabel,
    ]
      .map(normalizeOfferValue)
      .filter(Boolean);

    if (!valuesToCheck.length) return true;

    const buyTokens = ['buy', 'sale', 'sell', 'vente', 'acheter', 'a-vendre'];
    const rentTokens = ['rent', 'rental', 'location', 'louer', 'a-louer'];

    if (normalizedMode === 'buy') {
      return valuesToCheck.some((v) => buyTokens.some((token) => v.includes(token)));
    }

    if (normalizedMode === 'rent') {
      return valuesToCheck.some((v) => rentTokens.some((token) => v.includes(token)));
    }

    return true;
  }

  function propertyMatchesExtras(property, rooms, minSurface) {
    const propertyRooms = Number(
      property.rooms ??
      property.nb_rooms ??
      property.pieces ??
      property.rooms_count ??
      0
    );

    const propertySurface = Number(
      property.surface ??
      property.area ??
      property.area_m2 ??
      property.size ??
      0
    );

    if (rooms && propertyRooms && propertyRooms < Number(rooms)) {
      return false;
    }

    if (minSurface && propertySurface && propertySurface < Number(minSurface)) {
      return false;
    }

    return true;
  }

  async function loadPage(page) {
    const formData = new FormData(form);

    const params = {
      city: formData.get('city'),
      minPrice: formData.get('minPrice'),
      maxPrice: formData.get('maxPrice'),
      type: formData.get('type'),
      status: formData.get('status'),
      sort: formData.get('sort'),
      page,
      limit: currentLimit,
    };

    const mode = formData.get('mode');
    const rooms = formData.get('rooms');
    const minSurface = formData.get('minSurface');

    try {
      hideError(errorBox);
      resultsContainer.innerHTML = '<p class="small">Chargement des résultats…</p>';

      const result = await apiGetProperties(params);

      let filteredData = Array.isArray(result.data) ? result.data : [];
      filteredData = filteredData.filter((property) => propertyMatchesMode(property, mode));
      filteredData = filteredData.filter((property) =>
        propertyMatchesExtras(property, rooms, minSurface)
      );

      total = filteredData.length;
      currentPage = result.page;
      currentLimit = result.limit;

      renderPropertyList(resultsContainer, filteredData);

      if (!filteredData.length) {
        resultsContainer.innerHTML = `
          <div class="empty-state">
            <h3>Aucun bien trouvé</h3>
            <p>Essayez d’élargir les filtres ou de changer la ville recherchée.</p>
          </div>
        `;
      }

      const maxPage = Math.max(1, Math.ceil((result.total || 0) / currentLimit));
      paginationInfo.textContent = `Page ${currentPage} / ${maxPage}`;
      if (resultsCount) {
        resultsCount.textContent = `${filteredData.length} bien(s) affiché(s)`;
      }

      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= maxPage;
    } catch (e) {
      showError(errorBox, e.message);
      if (resultsCount) resultsCount.textContent = 'Erreur de chargement';
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    updatePageText();
    loadPage(1);
  });

  resetBtn?.addEventListener('click', () => {
    form.reset();
    if (modeField) modeField.value = initialMode || '';
    if (cityField) cityField.value = initialCity || '';
    updatePageText();
    loadPage(1);
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      loadPage(currentPage - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    const maxPage = Math.max(1, Math.ceil(total / currentLimit));
    if (currentPage < maxPage) {
      loadPage(currentPage + 1);
    }
  });

  updatePageText();
  loadPage(1);
});