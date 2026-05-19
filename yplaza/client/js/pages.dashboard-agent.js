document.addEventListener('DOMContentLoaded', async () => {
  requireRoleOnPage(['agent', 'agency', 'admin']);

  const listContainer = document.getElementById('my-properties-container');
  const errorBox = document.getElementById('dashboard-error');
  const successBox = document.getElementById('dashboard-success');
  const statsContainer = document.getElementById('agent-stats');
  const form = document.getElementById('property-form');
  const resetBtn = document.getElementById('btn-reset-form');
  const agencySelect = document.getElementById('property-agency');
  const imageInput = document.getElementById('property-images');
  const imagePreview = document.getElementById('image-preview');
  const existingImages = document.getElementById('existing-images');

  let properties = [];
  let editingProperty = null;
  let previewUrls = [];

  function setSuccess(message) {
    successBox.style.display = 'block';
    successBox.textContent = message;
    window.setTimeout(() => hideError(successBox), 2800);
  }

  function statusClass(status) {
    if (status === 'published') return 'badge-success';
    if (status === 'sold') return 'badge-danger';
    if (status === 'archived') return 'badge-muted';
    return 'badge';
  }

  function statusOptions(selected) {
    return ['draft', 'published', 'sold', 'archived']
      .map(
        (status) =>
          `<option value="${status}" ${selected === status ? 'selected' : ''}>${getStatusLabel(
            status
          )}</option>`
      )
      .join('');
  }

  function cleanupPreviewUrls() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
  }

  function renderSelectedPreview() {
    cleanupPreviewUrls();
    imagePreview.innerHTML = '';
    Array.from(imageInput.files || []).forEach((file) => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      const item = document.createElement('div');
      item.className = 'image-preview-item';
      item.innerHTML = `
        <img src="${url}" alt="Prévisualisation" />
        <span>${file.name}</span>
      `;
      imagePreview.appendChild(item);
    });
  }

  async function loadAgencies() {
    try {
      const { data } = await apiGetAgencies();
      agencySelect.innerHTML = '';
      data.forEach((agency) => {
        const opt = document.createElement('option');
        opt.value = agency.id;
        opt.textContent = `${agency.name} (${agency.city})`;
        agencySelect.appendChild(opt);
      });
    } catch (e) {
      showError(errorBox, e.message);
    }
  }

  function renderStats() {
    const totals = properties.reduce(
      (acc, property) => {
        acc.total += 1;
        acc[property.status] = (acc[property.status] || 0) + 1;
        acc.views += Number(property.views_count || 0);
        acc.favorites += Number(property.favorites_count || 0);
        acc.contacts += Number(property.contacts_count || 0);
        return acc;
      },
      { total: 0, views: 0, favorites: 0, contacts: 0 }
    );

    statsContainer.innerHTML = `
      <div class="stat-card"><span class="stat-label">Annonces</span><strong class="stat-value">${totals.total}</strong></div>
      <div class="stat-card"><span class="stat-label">Publiées</span><strong class="stat-value">${totals.published || 0}</strong></div>
      <div class="stat-card"><span class="stat-label">Vendues</span><strong class="stat-value">${totals.sold || 0}</strong></div>
      <div class="stat-card"><span class="stat-label">Vues</span><strong class="stat-value">${totals.views}</strong></div>
      <div class="stat-card"><span class="stat-label">Favoris</span><strong class="stat-value">${totals.favorites}</strong></div>
      <div class="stat-card"><span class="stat-label">Contacts</span><strong class="stat-value">${totals.contacts}</strong></div>
    `;
  }

  function renderExistingImages(property) {
    existingImages.innerHTML = '';
    if (!property || !property.id) {
      existingImages.innerHTML = '<p class="small">Les images existantes apparaîtront ici après l’enregistrement.</p>';
      return;
    }

    const images = Array.isArray(property.images) ? property.images : [];
    if (!images.length) {
      existingImages.innerHTML = '<p class="small">Aucune image enregistrée pour ce bien.</p>';
      return;
    }

    images.forEach((image) => {
      const item = document.createElement('div');
      item.className = 'image-manager-item';
      item.innerHTML = `
        <img src="${normalizeImageUrl(image.image_url)}" alt="Image du bien" />
        <div class="image-manager-actions">
          <button class="btn btn-secondary btn-main-image" type="button" data-id="${image.id}" ${
            image.is_main ? 'disabled' : ''
          }>${image.is_main ? 'Principale' : 'Définir principale'}</button>
          <button class="btn btn-secondary btn-delete-image" type="button" data-id="${image.id}">Supprimer</button>
        </div>
      `;
      existingImages.appendChild(item);
    });

    existingImages.querySelectorAll('.btn-main-image').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          const result = await apiSetMainPropertyImage(property.id, button.dataset.id);
          editingProperty = result.property;
          renderExistingImages(editingProperty);
          await loadMyProperties();
        } catch (e) {
          showError(errorBox, e.message);
        }
      });
    });

    existingImages.querySelectorAll('.btn-delete-image').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Supprimer cette image ?')) return;
        try {
          const result = await apiDeletePropertyImage(property.id, button.dataset.id);
          editingProperty = result.property;
          renderExistingImages(editingProperty);
          await loadMyProperties();
        } catch (e) {
          showError(errorBox, e.message);
        }
      });
    });
  }

  async function loadMyProperties() {
    try {
      hideError(errorBox);
      const { data } = await apiGetProperties({ createdBy: 'me', limit: 100, page: 1 });
      properties = Array.isArray(data) ? data : [];
      renderStats();
      listContainer.innerHTML = '';
      if (!properties.length) {
        listContainer.innerHTML = '<p>Vous n’avez pas encore publié de bien.</p>';
        return;
      }

      properties.forEach((property) => {
        const card = document.createElement('article');
        card.className = 'property-card property-card--managed';
        card.innerHTML = `
          <div class="property-media" style="background-image: url('${getPropertyImage(property)}');"></div>
          <div class="property-body">
            <div class="property-sub">${property.type}</div>
            <h3 class="property-title">${property.title}</h3>
            <p class="property-meta">${property.city} · ${property.surface} m² · ${property.rooms} pièce${Number(property.rooms) > 1 ? 's' : ''}</p>
            <div class="chips">
              <span class="badge ${statusClass(property.status)}">${getStatusLabel(property.status)}</span>
              <span class="badge">${property.views_count || 0} vues</span>
              <span class="badge">${property.favorites_count || 0} favoris</span>
              <span class="badge">${property.contacts_count || 0} contacts</span>
            </div>
            <div class="field">
              <label for="status-${property.id}">Changer le statut</label>
              <select id="status-${property.id}" class="property-status-select" data-id="${property.id}">
                ${statusOptions(property.status)}
              </select>
            </div>
          </div>
          <footer class="property-footer property-footer--wrap">
            <span>Créé le ${formatDate(property.created_at)}</span>
            <div class="inline-actions">
              <a class="btn btn-secondary" href="./property.html?id=${property.id}">Voir</a>
              <button class="btn btn-secondary btn-edit" data-id="${property.id}" type="button">Éditer</button>
              <button class="btn btn-secondary btn-delete" data-id="${property.id}" type="button">Supprimer</button>
            </div>
          </footer>
        `;
        listContainer.appendChild(card);
      });

      listContainer.querySelectorAll('.btn-edit').forEach((button) => {
        button.addEventListener('click', () => populateForm(button.dataset.id));
      });
      listContainer.querySelectorAll('.btn-delete').forEach((button) => {
        button.addEventListener('click', async () => {
          if (!window.confirm('Supprimer ce bien ?')) return;
          try {
            await apiDeleteProperty(button.dataset.id);
            setSuccess('Annonce supprimée.');
            clearForm();
            await loadMyProperties();
          } catch (e) {
            showError(errorBox, e.message);
          }
        });
      });
      listContainer.querySelectorAll('.property-status-select').forEach((select) => {
        select.addEventListener('change', async () => {
          try {
            await apiUpdatePropertyStatus(select.dataset.id, select.value);
            setSuccess('Statut mis à jour.');
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
    cleanupPreviewUrls();
    imagePreview.innerHTML = '';
    document.getElementById('property-id').value = '';
    document.getElementById('property-status').value = 'draft';
    editingProperty = null;
    renderExistingImages(null);
  }

  function populateForm(id) {
    const property = properties.find((item) => String(item.id) === String(id));
    if (!property) return;
    editingProperty = property;
    document.getElementById('property-id').value = property.id;
    document.getElementById('property-title').value = property.title;
    document.getElementById('property-description').value = property.description || '';
    document.getElementById('property-price').value = property.price;
    document.getElementById('property-city').value = property.city;
    document.getElementById('property-surface').value = property.surface;
    document.getElementById('property-rooms').value = property.rooms;
    document.getElementById('property-type').value = property.type;
    document.getElementById('property-status').value = property.status;
    if (property.agency_id) {
      document.getElementById('property-agency').value = property.agency_id;
    }
    cleanupPreviewUrls();
    imageInput.value = '';
    imagePreview.innerHTML = '';
    renderExistingImages(property);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
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
      const saved = id
        ? await apiUpdateProperty(id, payload)
        : await apiCreateProperty(payload);
      const savedProperty = saved.property;
      if (imageInput.files && imageInput.files.length > 0) {
        await apiUploadPropertyImages(savedProperty.id, imageInput.files);
      }
      setSuccess(id ? 'Annonce mise à jour.' : 'Annonce créée.');
      clearForm();
      await loadMyProperties();
    } catch (e) {
      showError(errorBox, e.message);
    }
  });

  resetBtn.addEventListener('click', () => {
    clearForm();
  });

  imageInput.addEventListener('change', renderSelectedPreview);

  await loadAgencies();
  clearForm();
  await loadMyProperties();
});
