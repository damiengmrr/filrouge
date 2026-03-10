function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return `${n.toLocaleString('fr-FR')} €`;
}

function createPropertyCard(property) {
  const link = `./property.html?id=${encodeURIComponent(property.id)}`;
  const statusClass = property.status === 'available' ? 'badge-success' : 'badge-danger';
  const statusLabel = property.status === 'available' ? 'Disponible' : 'Vendu';

  const div = document.createElement('article');
  div.className = 'property-card';
  div.innerHTML = `
    <header class="property-header">
      <h3 class="property-title">
        <a href="${link}">${property.title}</a>
      </h3>
      <div class="property-price">${formatPrice(property.price)}</div>
    </header>
    <div class="property-meta">
      ${property.city} • ${property.surface} m² • ${property.rooms} pièces • ${property.type}
    </div>
    <div class="chips">
      <span class="badge ${statusClass}">${statusLabel}</span>
      <span class="badge">Vues : ${property.views_count ?? 0}</span>
      ${
        property.agency_name
          ? `<span class="badge">${property.agency_name} (${property.agency_city})</span>`
          : ''
      }
    </div>
    <footer class="property-footer">
      <span>Créé le ${new Date(property.created_at).toLocaleDateString('fr-FR')}</span>
      <a class="btn btn-secondary" href="${link}">Voir le détail</a>
    </footer>
  `;
  return div;
}

function renderPropertyList(container, properties) {
  container.innerHTML = '';
  if (!properties || properties.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Aucun bien trouvé.';
    container.appendChild(p);
    return;
  }
  properties.forEach((p) => {
    container.appendChild(createPropertyCard(p));
  });
}

function showError(element, message) {
  if (!element) return;
  element.style.display = 'block';
  element.textContent = message;
}

function hideError(element) {
  if (!element) return;
  element.style.display = 'none';
  element.textContent = '';
}

