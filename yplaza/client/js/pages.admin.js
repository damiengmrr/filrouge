document.addEventListener('DOMContentLoaded', async () => {
  requireRoleOnPage(['admin']);

  const statsContainer = document.getElementById('stats-container');
  const agenciesBody = document.getElementById('agencies-body');
  const usersBody = document.getElementById('users-body');
  const propertiesContainer = document.getElementById('admin-properties-container');
  const adminError = document.getElementById('admin-error');
  const adminSuccess = document.getElementById('admin-success');

  const agencyForm = document.getElementById('agency-form');
  const agencyIdInput = document.getElementById('agency-id');
  const agencyNameInput = document.getElementById('agency-name');
  const agencyCityInput = document.getElementById('agency-city');
  const agencyEmailInput = document.getElementById('agency-email');
  const agencyPhoneInput = document.getElementById('agency-phone');
  const agencyAddressInput = document.getElementById('agency-address');
  const resetAgencyBtn = document.getElementById('btn-reset-agency');

  const propertyForm = document.getElementById('admin-property-form');
  const propertyImageInput = document.getElementById('admin-property-images');
  const propertyImagePreview = document.getElementById('admin-image-preview');
  const propertyExistingImages = document.getElementById('admin-existing-images');
  const resetPropertyBtn = document.getElementById('btn-reset-admin-property');

  const userForm = document.getElementById('user-form');
  const resetUserBtn = document.getElementById('btn-reset-user');

  let agencies = [];
  let users = [];
  let properties = [];
  let editingProperty = null;
  let previewUrls = [];

  function setSuccess(message) {
    adminSuccess.style.display = 'block';
    adminSuccess.textContent = message;
    window.setTimeout(() => hideError(adminSuccess), 2800);
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
    propertyImagePreview.innerHTML = '';
    Array.from(propertyImageInput.files || []).forEach((file) => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      const item = document.createElement('div');
      item.className = 'image-preview-item';
      item.innerHTML = `<img src="${url}" alt="Prévisualisation" /><span>${file.name}</span>`;
      propertyImagePreview.appendChild(item);
    });
  }

  async function loadStats() {
    try {
      const stats = await apiGetStatsOverview();
      statsContainer.innerHTML = `
        <div class="stat-card"><span class="stat-label">Annonces</span><strong class="stat-value">${stats.total_properties}</strong></div>
        <div class="stat-card"><span class="stat-label">Publiées</span><strong class="stat-value">${stats.published_properties}</strong></div>
        <div class="stat-card"><span class="stat-label">Vendues</span><strong class="stat-value">${stats.sold_properties}</strong></div>
        <div class="stat-card"><span class="stat-label">Agences</span><strong class="stat-value">${stats.total_agencies}</strong></div>
        <div class="stat-card"><span class="stat-label">Utilisateurs</span><strong class="stat-value">${stats.total_users}</strong></div>
        <div class="stat-card">
          <span class="stat-label">Dernières annonces</span>
          <ul class="compact-list">
            ${(stats.latest_properties || [])
              .map((p) => `<li>${p.title} · ${p.city} · ${getStatusLabel(p.status)}</li>`)
              .join('')}
          </ul>
        </div>
      `;
    } catch (e) {
      statsContainer.innerHTML =
        '<p style="font-size:0.85rem;color:#b91c1c;">Impossible de charger les statistiques.</p>';
    }
  }

  function populateAgencySelects() {
    const propertyAgency = document.getElementById('admin-property-agency');
    const userAgency = document.getElementById('user-agency');

    propertyAgency.innerHTML = '';
    userAgency.innerHTML = '<option value="">Aucune agence</option>';
    agencies.forEach((agency) => {
      const propertyOption = document.createElement('option');
      propertyOption.value = agency.id;
      propertyOption.textContent = `${agency.name} (${agency.city})`;
      propertyAgency.appendChild(propertyOption);

      const userOption = document.createElement('option');
      userOption.value = agency.id;
      userOption.textContent = `${agency.name} (${agency.city})`;
      userAgency.appendChild(userOption);
    });
  }

  async function loadAgencies() {
    try {
      const { data } = await apiGetAgencies();
      agencies = Array.isArray(data) ? data : [];
      populateAgencySelects();
      agenciesBody.innerHTML = '';
      agencies.forEach((agency) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${agency.name}</td>
          <td>${agency.city}</td>
          <td>${[agency.email, agency.phone].filter(Boolean).join(' · ') || '—'}</td>
          <td>${agency.properties_count || 0}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-edit-agency" data-id="${agency.id}">Éditer</button>
            <button type="button" class="btn btn-secondary btn-delete-agency" data-id="${agency.id}">Supprimer</button>
          </td>
        `;
        agenciesBody.appendChild(tr);
      });

      agenciesBody.querySelectorAll('.btn-edit-agency').forEach((button) => {
        button.addEventListener('click', () => {
          const agency = agencies.find((item) => String(item.id) === String(button.dataset.id));
          if (!agency) return;
          agencyIdInput.value = agency.id;
          agencyNameInput.value = agency.name || '';
          agencyCityInput.value = agency.city || '';
          agencyEmailInput.value = agency.email || '';
          agencyPhoneInput.value = agency.phone || '';
          agencyAddressInput.value = agency.address || '';
          agencyForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      agenciesBody.querySelectorAll('.btn-delete-agency').forEach((button) => {
        button.addEventListener('click', async () => {
          if (!window.confirm('Supprimer cette agence et ses annonces associées ?')) return;
          try {
            await apiDeleteAgency(button.dataset.id);
            setSuccess('Agence supprimée.');
            await refreshAll();
          } catch (e) {
            showError(adminError, e.message);
          }
        });
      });
    } catch (e) {
      showError(adminError, e.message);
    }
  }

  function clearAgencyForm() {
    agencyIdInput.value = '';
    agencyForm.reset();
  }

  function renderExistingImages(property) {
    propertyExistingImages.innerHTML = '';
    if (!property || !property.id) {
      propertyExistingImages.innerHTML = '<p class="small">Les images existantes apparaîtront ici après l’enregistrement.</p>';
      return;
    }
    const images = Array.isArray(property.images) ? property.images : [];
    if (!images.length) {
      propertyExistingImages.innerHTML = '<p class="small">Aucune image enregistrée pour ce bien.</p>';
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
      propertyExistingImages.appendChild(item);
    });

    propertyExistingImages.querySelectorAll('.btn-main-image').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          const result = await apiSetMainPropertyImage(property.id, button.dataset.id);
          editingProperty = result.property;
          renderExistingImages(editingProperty);
          await refreshPropertiesAndStats();
        } catch (e) {
          showError(adminError, e.message);
        }
      });
    });

    propertyExistingImages.querySelectorAll('.btn-delete-image').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Supprimer cette image ?')) return;
        try {
          const result = await apiDeletePropertyImage(property.id, button.dataset.id);
          editingProperty = result.property;
          renderExistingImages(editingProperty);
          await refreshPropertiesAndStats();
        } catch (e) {
          showError(adminError, e.message);
        }
      });
    });
  }

  async function loadProperties() {
    try {
      const { data } = await apiGetProperties({ limit: 100, page: 1 });
      properties = Array.isArray(data) ? data : [];
      propertiesContainer.innerHTML = '';
      if (!properties.length) {
        propertiesContainer.innerHTML = '<p class="small">Aucune annonce enregistrée.</p>';
        return;
      }

      properties.forEach((property) => {
        const item = document.createElement('article');
        item.className = 'admin-list-item';
        item.innerHTML = `
          <img src="${getPropertyImage(property)}" alt="Annonce" />
          <div>
            <strong>${property.title}</strong>
            <p class="small">${property.city} · ${formatPrice(property.price)} · ${
          property.agency_name || 'Agence inconnue'
        }</p>
            <div class="chips">
              <span class="badge ${statusClass(property.status)}">${getStatusLabel(property.status)}</span>
              <span class="badge">${property.views_count || 0} vues</span>
              <span class="badge">${property.favorites_count || 0} favoris</span>
              <span class="badge">${property.contacts_count || 0} contacts</span>
            </div>
          </div>
          <div class="admin-list-actions">
            <select class="admin-property-status" data-id="${property.id}">
              ${statusOptions(property.status)}
            </select>
            <a class="btn btn-secondary" href="./property.html?id=${property.id}">Voir</a>
            <button class="btn btn-secondary btn-edit-property" type="button" data-id="${property.id}">Éditer</button>
            <button class="btn btn-secondary btn-delete-property" type="button" data-id="${property.id}">Supprimer</button>
          </div>
        `;
        propertiesContainer.appendChild(item);
      });

      propertiesContainer.querySelectorAll('.admin-property-status').forEach((select) => {
        select.addEventListener('change', async () => {
          try {
            await apiUpdatePropertyStatus(select.dataset.id, select.value);
            setSuccess('Statut mis à jour.');
            await refreshPropertiesAndStats();
          } catch (e) {
            showError(adminError, e.message);
          }
        });
      });

      propertiesContainer.querySelectorAll('.btn-edit-property').forEach((button) => {
        button.addEventListener('click', () => populatePropertyForm(button.dataset.id));
      });

      propertiesContainer.querySelectorAll('.btn-delete-property').forEach((button) => {
        button.addEventListener('click', async () => {
          if (!window.confirm('Supprimer cette annonce ?')) return;
          try {
            await apiDeleteProperty(button.dataset.id);
            setSuccess('Annonce supprimée.');
            clearPropertyForm();
            await refreshAll();
          } catch (e) {
            showError(adminError, e.message);
          }
        });
      });
    } catch (e) {
      showError(adminError, e.message);
    }
  }

  function propertyPayload() {
    return {
      title: document.getElementById('admin-property-title').value,
      city: document.getElementById('admin-property-city').value,
      type: document.getElementById('admin-property-type').value,
      price: document.getElementById('admin-property-price').value,
      surface: document.getElementById('admin-property-surface').value,
      rooms: document.getElementById('admin-property-rooms').value,
      status: document.getElementById('admin-property-status').value,
      agency_id: document.getElementById('admin-property-agency').value,
      description: document.getElementById('admin-property-description').value,
    };
  }

  function clearPropertyForm() {
    propertyForm.reset();
    cleanupPreviewUrls();
    propertyImagePreview.innerHTML = '';
    propertyImageInput.value = '';
    document.getElementById('admin-property-id').value = '';
    document.getElementById('admin-property-status').value = 'draft';
    editingProperty = null;
    renderExistingImages(null);
  }

  function populatePropertyForm(id) {
    const property = properties.find((item) => String(item.id) === String(id));
    if (!property) return;
    editingProperty = property;
    document.getElementById('admin-property-id').value = property.id;
    document.getElementById('admin-property-title').value = property.title || '';
    document.getElementById('admin-property-city').value = property.city || '';
    document.getElementById('admin-property-type').value = property.type || '';
    document.getElementById('admin-property-price').value = property.price || '';
    document.getElementById('admin-property-surface').value = property.surface || '';
    document.getElementById('admin-property-rooms').value = property.rooms || '';
    document.getElementById('admin-property-status').value = property.status || 'draft';
    document.getElementById('admin-property-agency').value = property.agency_id || '';
    document.getElementById('admin-property-description').value = property.description || '';
    cleanupPreviewUrls();
    propertyImageInput.value = '';
    propertyImagePreview.innerHTML = '';
    renderExistingImages(property);
    propertyForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadUsers() {
    try {
      const { data } = await apiGetUsers();
      users = Array.isArray(data) ? data : [];
      usersBody.innerHTML = '';
      users.forEach((user) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>
            <select data-id="${user.id}" class="user-role-select">
              <option value="client" ${user.role === 'client' ? 'selected' : ''}>client</option>
              <option value="agent" ${user.role === 'agent' ? 'selected' : ''}>agent</option>
              <option value="agency" ${user.role === 'agency' ? 'selected' : ''}>agency</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
            </select>
            <p class="small">${user.is_active === false ? 'Désactivé' : 'Actif'}</p>
          </td>
          <td>${user.agency_name || '—'}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-edit-user" data-id="${user.id}">Éditer</button>
            <button type="button" class="btn btn-secondary btn-disable-user" data-id="${user.id}" ${
          user.is_active === false ? 'disabled' : ''
        }>Désactiver</button>
          </td>
        `;
        usersBody.appendChild(tr);
      });

      usersBody.querySelectorAll('.user-role-select').forEach((select) => {
        select.addEventListener('change', async () => {
          try {
            await apiChangeUserRole(select.dataset.id, select.value);
            setSuccess('Rôle mis à jour.');
            await loadUsers();
            await loadStats();
          } catch (e) {
            showError(adminError, e.message);
          }
        });
      });

      usersBody.querySelectorAll('.btn-edit-user').forEach((button) => {
        button.addEventListener('click', () => populateUserForm(button.dataset.id));
      });

      usersBody.querySelectorAll('.btn-disable-user').forEach((button) => {
        button.addEventListener('click', async () => {
          if (!window.confirm('Désactiver ce compte utilisateur ?')) return;
          try {
            await apiDeleteUser(button.dataset.id);
            setSuccess('Utilisateur désactivé.');
            await loadUsers();
            await loadStats();
          } catch (e) {
            showError(adminError, e.message);
          }
        });
      });
    } catch (e) {
      showError(adminError, e.message);
    }
  }

  function clearUserForm() {
    userForm.reset();
    document.getElementById('user-id').value = '';
    document.getElementById('user-active').value = 'true';
  }

  function populateUserForm(id) {
    const user = users.find((item) => String(item.id) === String(id));
    if (!user) return;
    document.getElementById('user-id').value = user.id;
    document.getElementById('user-name').value = user.name || '';
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-role').value = user.role || 'client';
    document.getElementById('user-agency').value = user.agency_id || '';
    document.getElementById('user-active').value = user.is_active === false ? 'false' : 'true';
    userForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function refreshPropertiesAndStats() {
    await loadProperties();
    await loadStats();
  }

  async function refreshAll() {
    await loadStats();
    await loadAgencies();
    await loadProperties();
    await loadUsers();
  }

  agencyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError(adminError);
    const payload = {
      name: agencyNameInput.value,
      city: agencyCityInput.value,
      email: agencyEmailInput.value,
      phone: agencyPhoneInput.value,
      address: agencyAddressInput.value,
    };
    try {
      if (agencyIdInput.value) {
        await apiUpdateAgency(agencyIdInput.value, payload);
        setSuccess('Agence mise à jour.');
      } else {
        await apiCreateAgency(payload);
        setSuccess('Agence créée.');
      }
      clearAgencyForm();
      await refreshAll();
    } catch (e) {
      showError(adminError, e.message);
    }
  });

  propertyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError(adminError);
    const id = document.getElementById('admin-property-id').value;
    try {
      const saved = id
        ? await apiUpdateProperty(id, propertyPayload())
        : await apiCreateProperty(propertyPayload());
      if (propertyImageInput.files && propertyImageInput.files.length > 0) {
        await apiUploadPropertyImages(saved.property.id, propertyImageInput.files);
      }
      setSuccess(id ? 'Annonce mise à jour.' : 'Annonce créée.');
      clearPropertyForm();
      await refreshPropertiesAndStats();
      await loadAgencies();
    } catch (e) {
      showError(adminError, e.message);
    }
  });

  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideError(adminError);
    const id = document.getElementById('user-id').value;
    const payload = {
      name: document.getElementById('user-name').value,
      email: document.getElementById('user-email').value,
      role: document.getElementById('user-role').value,
      agency_id: document.getElementById('user-agency').value || null,
      is_active: document.getElementById('user-active').value === 'true',
    };
    const password = document.getElementById('user-password').value;
    if (password) payload.password = password;

    try {
      if (id) {
        await apiUpdateUser(id, payload);
        setSuccess('Utilisateur mis à jour.');
      } else {
        await apiCreateUser({ ...payload, password });
        setSuccess('Utilisateur créé.');
      }
      clearUserForm();
      await loadUsers();
      await loadStats();
    } catch (e) {
      showError(adminError, e.message);
    }
  });

  resetAgencyBtn.addEventListener('click', clearAgencyForm);
  resetPropertyBtn.addEventListener('click', clearPropertyForm);
  resetUserBtn.addEventListener('click', clearUserForm);
  propertyImageInput.addEventListener('change', renderSelectedPreview);

  await refreshAll();
  clearPropertyForm();
  clearUserForm();
});
