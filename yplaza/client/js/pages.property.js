document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const detail = document.getElementById('property-detail');
  const errorBox = document.getElementById('property-error');
  const btnFavorite = document.getElementById('btn-favorite');
  const favoriteHint = document.getElementById('favorite-hint');

  if (!id) {
    showError(errorBox, 'Identifiant de bien manquant dans l’URL.');
    return;
  }

  async function refreshFavoriteState() {
    const user = getCurrentUser();
    if (!user || user.role !== 'client') {
      btnFavorite.style.display = 'none';
      favoriteHint.style.display = 'block';
      return;
    }
    favoriteHint.style.display = 'none';
    try {
      const { data: favorites } = await apiGetFavorites();
      const isFav = favorites.some((f) => String(f.property_id) === String(id));
      btnFavorite.textContent = isFav ? 'Retirer des favoris' : 'Ajouter aux favoris';
      btnFavorite.dataset.favoriteState = isFav ? 'on' : 'off';
      btnFavorite.style.display = 'inline-flex';
    } catch (e) {
      // ignorer, bouton caché
      btnFavorite.style.display = 'none';
      favoriteHint.style.display = 'block';
    }
  }

  try {
    hideError(errorBox);
    const { property } = await apiGetProperty(id);
    detail.innerHTML = `
      <h2 style="margin-top:0">${property.title}</h2>
      <p class="property-price" style="margin-bottom:0.5rem">${property.price.toLocaleString(
        'fr-FR'
      )} €</p>
      <p class="property-meta">
        ${property.city} • ${property.surface} m² • ${property.rooms} pièces • ${property.type}
      </p>
      <p style="font-size:0.9rem;margin-top:0.5rem">${property.description || ''}</p>
      <div class="chips" style="margin-top:0.5rem">
        <span class="badge ${
          property.status === 'available' ? 'badge-success' : 'badge-danger'
        }">${property.status === 'available' ? 'Disponible' : 'Vendu'}</span>
        <span class="badge">Agence : ${
          property.agency_name ? `${property.agency_name} (${property.agency_city})` : 'N/A'
        }</span>
        <span class="badge">Vues : ${property.views_count}</span>
      </div>
    `;
  } catch (e) {
    showError(errorBox, e.message);
  }

  btnFavorite.addEventListener('click', async () => {
    const state = btnFavorite.dataset.favoriteState || 'off';
    try {
      if (state === 'on') {
        await apiRemoveFavorite(id);
      } else {
        await apiAddFavorite(id);
      }
      await refreshFavoriteState();
    } catch (e) {
      showError(errorBox, e.message);
    }
  });

  refreshFavoriteState();
});

