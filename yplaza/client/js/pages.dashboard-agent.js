document.addEventListener('DOMContentLoaded', async () => {
  requireRoleOnPage(['agent', 'admin']);

  const listContainer = document.getElementById('my-properties-container');
  const errorBox = document.getElementById('dashboard-error');
  const form = document.getElementById('property-form');
  const resetBtn = document.getElementById('btn-reset-form');
  const agencySelect = document.getElementById('property-agency');

  async function loadAgencies() {
    try {
      const { data } = await apiGetAgencies();
      agencySelect.innerHTML = '';
      data.forEach((a) => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.name} (${a.city})`;
        agencySelect.appendChild(opt);
      });
    } catch (e) {
      // ignorer, champ optionnel
    }
  }

  async function loadMyProperties() {
    try {
      hideError(errorBox);
      const { data } = await apiGetProperties({ createdBy: 'me', limit: 50, page: 1 });
      listContainer.innerHTML = '';
      if (!data || data.length === 0) {
        listContainer.innerHTML = '<p>Vous n’avez pas encore publié de bien.</p>';
        return;
      }
      data.forEach((p) => {
        const card = document.createElement('article');
        card.className = 'property-card';
        card.innerHTML = `
          <header class="property-header">
            <h3 class="property-title">${p.title}</h3>
            <div class="property-price">${formatPrice(p.price)}</div>
          </header>
          <p class="property-meta">
            ${p.city} • ${p.surface} m² • ${p.rooms} pièces • ${p.type}
          </p>
          <div class="chips">
            <span class="badge ${
              p.status === 'available' ? 'badge-success' : 'badge-danger'
            }">${p.status === 'available' ? 'Disponible' : 'Vendu'}</span>
          </div>
          <footer class="property-footer">
            <span>Créé le ${new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
            <div style="display:flex;gap:0.35rem">
              <button class="btn btn-secondary btn-edit" data-id="${p.id}" type="button">Éditer</button>
              <button class="btn btn-secondary btn-status" data-id="${p.id}" data-status="${
                p.status
              }" type="button">${
                p.status === 'available' ? 'Marquer comme vendu' : 'Remettre en dispo'
              }</button>
              <button class="btn btn-secondary btn-delete" data-id="${p.id}" type="button">Supprimer</button>
            </div>
          </footer>
        `;
        listContainer.appendChild(card);
      });

      listContainer.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', () => populateForm(btn.dataset.id, data));
      });
      listContainer.querySelectorAll('.btn-delete').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Supprimer ce bien ?')) return;
          try {
            await apiDeleteProperty(btn.dataset.id);
            await loadMyProperties();
          } catch (e) {
            showError(errorBox, e.message);
          }
        });
      });
      listContainer.querySelectorAll('.btn-status').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const next = btn.dataset.status === 'available' ? 'sold' : 'available';
          try {
            await apiUpdatePropertyStatus(btn.dataset.id, next);
            await loadMyProperties();
          } catch (e) {
            showError(errorBox, e.message);
          }
        });
      });
    } catch (e) {
      showError(errorBox, e.message);
    }
  }

  function clearForm() {
    form.reset();
    document.getElementById('property-id').value = '';
    document.getElementById('property-status').value = 'available';
  }

  function populateForm(id, list) {
    const p = list.find((item) => String(item.id) === String(id));
    if (!p) return;
    document.getElementById('property-id').value = p.id;
    document.getElementById('property-title').value = p.title;
    document.getElementById('property-description').value = p.description || '';
    document.getElementById('property-price').value = p.price;
    document.getElementById('property-city').value = p.city;
    document.getElementById('property-surface').value = p.surface;
    document.getElementById('property-rooms').value = p.rooms;
    document.getElementById('property-type').value = p.type;
    document.getElementById('property-status').value = p.status;
    if (p.agency_id) {
      document.getElementById('property-agency').value = p.agency_id;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(errorBox);
    const id = document.getElementById('property-id').value;
    const payload = {
      title: document.getElementById('property-title').value,
      description: document.getElementById('property-description').value,
      price: document.getElementById('property-price').value,
      city: document.getElementById('property-city').value,
      surface: document.getElementById('property-surface').value,
      rooms: document.getElementById('property-rooms').value,
      type: document.getElementById('property-type').value,
      status: document.getElementById('property-status').value,
      agency_id: document.getElementById('property-agency').value || null,
    };
    try {
      if (id) {
        await apiUpdateProperty(id, payload);
      } else {
        await apiCreateProperty(payload);
      }
      clearForm();
      await loadMyProperties();
    } catch (e2) {
      showError(errorBox, e2.message);
    }
  });

  resetBtn.addEventListener('click', () => {
    clearForm();
  });

  await loadAgencies();
  await loadMyProperties();
});

