document.addEventListener('DOMContentLoaded', async () => {
  const latestContainer = document.getElementById('latest-container');
  const latestError = document.getElementById('latest-error');
  const statsContainer = document.getElementById('home-stats');

  if (!latestContainer) return;

  try {
    hideError(latestError);
    const { data } = await apiGetProperties({ sort: 'created_at_desc', limit: 6, page: 1 });
    renderPropertyList(latestContainer, data);
  } catch (e) {
    showError(latestError, e.message);
  }

  if (statsContainer) {
    try {
      const stats = await apiGetStatsOverview();
      statsContainer.innerHTML = `
        <h2 style="margin-top:0;font-size:1rem">En un coup d’œil</h2>
        <p style="font-size:0.9rem;margin-bottom:0.4rem">
          Total de biens : <strong>${stats.total_properties}</strong>
        </p>
        <p style="font-size:0.85rem;margin-bottom:0.25rem"><strong>Prix moyen par ville (top 3)</strong></p>
        <ul style="margin:0;padding-left:1.1rem;font-size:0.8rem">
          ${stats.avg_price_by_city
            .slice(0, 3)
            .map(
              (c) =>
                `<li>${c.city} : ${c.avg_price.toLocaleString('fr-FR', {
                  maximumFractionDigits: 0,
                })} € (${c.count} biens)</li>`
            )
            .join('')}
        </ul>
      `;
    } catch (e) {
      statsContainer.innerHTML =
        '<p style="font-size:0.85rem;color:#b91c1c;">Impossible de charger les statistiques.</p>';
    }
  }
});

