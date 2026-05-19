document.addEventListener('DOMContentLoaded', async () => {
  const latestContainer = document.getElementById('latest-container');
  const latestError = document.getElementById('latest-error');
  const statsContainer = document.getElementById('home-stats');

  const heroTabs = Array.from(document.querySelectorAll('.hero-search__tab'));
  const heroCityInput = document.getElementById('hero-city');
  const heroSearchBtn = document.getElementById('hero-search-btn');

  if (!latestContainer) return;

  let heroMode = 'buy';

  function setActiveHeroTab(mode) {
    heroMode = mode;

    heroTabs.forEach((tab) => {
      const isActive = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (heroSearchBtn) {
      heroSearchBtn.textContent = mode === 'estimate' ? 'Estimer' : 'Rechercher';
    }
  }

  function goFromHero() {
    const city = (heroCityInput?.value || '').trim();

    if (heroMode === 'estimate') {
      const url = new URL('./estimate.html', window.location.href);
      if (city) url.searchParams.set('city', city);
      window.location.href = url.toString();
      return;
    }

    const url = new URL('./search.html', window.location.href);
    url.searchParams.set('mode', heroMode);
    if (city) url.searchParams.set('city', city);
    window.location.href = url.toString();
  }

  heroTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActiveHeroTab(tab.dataset.mode || 'buy');
    });

    tab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveHeroTab(tab.dataset.mode || 'buy');
      }
    });
  });

  heroSearchBtn?.addEventListener('click', goFromHero);

  heroCityInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goFromHero();
    }
  });

  setActiveHeroTab('buy');

  try {
    hideError(latestError);
    latestContainer.innerHTML = '<p class="small">Chargement des biens…</p>';

    const { data } = await apiGetProperties({
      sort: 'created_at_desc',
      limit: 6,
      page: 1,
    });

    renderPropertyList(latestContainer, data);
  } catch (e) {
    showError(latestError, e.message);
  }

  if (statsContainer) {
    try {
      const stats = await apiGetStatsOverview();

      statsContainer.innerHTML = `
        <div class="stats-grid">
          <article class="stat-card">
            <span class="stat-label">Biens publiés</span>
            <strong class="stat-value">${stats.total_properties}</strong>
          </article>

          <article class="stat-card">
            <span class="stat-label">Ville la plus active</span>
            <strong class="stat-value">${stats.avg_price_by_city?.[0]?.city || '—'}</strong>
          </article>

          <article class="stat-card">
            <span class="stat-label">Prix moyen top ville</span>
            <strong class="stat-value">${
              stats.avg_price_by_city?.[0]?.avg_price
                ? `${Number(stats.avg_price_by_city[0].avg_price).toLocaleString('fr-FR', {
                    maximumFractionDigits: 0,
                  })} €`
                : '—'
            }</strong>
          </article>
        </div>

        <div class="stats-list">
          <h3 class="section-title" style="margin-top:0;">Prix moyen par ville</h3>
          <ul class="city-stats-list">
            ${(stats.avg_price_by_city || [])
              .slice(0, 5)
              .map(
                (c) => `
                  <li>
                    <span>${c.city}</span>
                    <strong>${Number(c.avg_price).toLocaleString('fr-FR', {
                      maximumFractionDigits: 0,
                    })} €</strong>
                    <small>${c.count} bien(s)</small>
                  </li>
                `
              )
              .join('')}
          </ul>
        </div>
      `;
    } catch (e) {
      statsContainer.innerHTML =
        '<p class="small" style="color:#b91c1c;">Impossible de charger les statistiques.</p>';
    }
  }
});