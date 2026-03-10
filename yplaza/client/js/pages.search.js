document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search-form');
  const resultsContainer = document.getElementById('results-container');
  const errorBox = document.getElementById('search-error');
  const paginationInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  let currentPage = 1;
  let currentLimit = 9;
  let total = 0;

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

    try {
      hideError(errorBox);
      const result = await apiGetProperties(params);
      total = result.total;
      currentPage = result.page;
      currentLimit = result.limit;
      renderPropertyList(resultsContainer, result.data);

      const maxPage = Math.max(1, Math.ceil(total / currentLimit));
      paginationInfo.textContent = `Page ${currentPage} / ${maxPage} • ${total} bien(s) trouvé(s)`;
      prevBtn.disabled = currentPage <= 1;
      nextBtn.disabled = currentPage >= maxPage;
    } catch (e) {
      showError(errorBox, e.message);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
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

  loadPage(1);
});

