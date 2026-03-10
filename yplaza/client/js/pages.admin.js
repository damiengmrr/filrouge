document.addEventListener('DOMContentLoaded', async () => {
  requireRoleOnPage(['admin']);

  const statsContainer = document.getElementById('stats-container');
  const agenciesBody = document.getElementById('agencies-body');
  const usersBody = document.getElementById('users-body');
  const adminError = document.getElementById('admin-error');

  const agencyForm = document.getElementById('agency-form');
  const agencyIdInput = document.getElementById('agency-id');
  const agencyNameInput = document.getElementById('agency-name');
  const agencyCityInput = document.getElementById('agency-city');
  const resetAgencyBtn = document.getElementById('btn-reset-agency');

  async function loadStats() {
    try {
      const stats = await apiGetStatsOverview();
      statsContainer.innerHTML = `
        <div class="stat-card">
          <strong>Total de biens</strong><br />
          ${stats.total_properties}
        </div>
        <div class="stat-card">
          <strong>Prix moyen par ville (top 5)</strong>
          <ul style="margin:0.3rem 0 0;padding-left:1.1rem;font-size:0.8rem">
            ${stats.avg_price_by_city
              .map(
                (c) =>
                  `<li>${c.city} : ${c.avg_price.toLocaleString('fr-FR', {
                    maximumFractionDigits: 0,
                  })} € (${c.count} biens)</li>`
              )
              .join('')}
          </ul>
        </div>
        <div class="stat-card">
          <strong>Biens les plus consultés</strong>
          <ul style="margin:0.3rem 0 0;padding-left:1.1rem;font-size:0.8rem">
            ${stats.most_viewed_properties
              .map((p) => `<li>${p.title} (${p.city}) • ${p.views_count} vues</li>`)
              .join('')}
          </ul>
        </div>
        <div class="stat-card">
          <strong>Biens par type</strong>
          <ul style="margin:0.3rem 0 0;padding-left:1.1rem;font-size:0.8rem">
            ${stats.properties_count_by_type
              .map((t) => `<li>${t.type} : ${t.count}</li>`)
              .join('')}
          </ul>
        </div>
        <div class="stat-card">
          <strong>Tendance par ville</strong>
          <ul style="margin:0.3rem 0 0;padding-left:1.1rem;font-size:0.8rem">
            ${stats.trend_score_by_city
              .map((c) => `<li>${c.city} : score ${c.score}</li>`)
              .join('')}
          </ul>
        </div>
      `;
    } catch (e) {
      statsContainer.innerHTML =
        '<p style="font-size:0.85rem;color:#b91c1c;">Impossible de charger les statistiques.</p>';
    }
  }

  async function loadAgencies() {
    try {
      const { data } = await apiGetAgencies();
      agenciesBody.innerHTML = '';
      data.forEach((a) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${a.name}</td>
          <td>${a.city}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-edit-agency" data-id="${
              a.id
            }">Éditer</button>
            <button type="button" class="btn btn-secondary btn-delete-agency" data-id="${
              a.id
            }">Supprimer</button>
          </td>
        `;
        agenciesBody.appendChild(tr);
      });

      agenciesBody.querySelectorAll('.btn-edit-agency').forEach((btn) => {
        btn.addEventListener('click', () => {
          const row = btn.closest('tr');
          agencyIdInput.value = btn.dataset.id;
          agencyNameInput.value = row.children[0].textContent;
          agencyCityInput.value = row.children[1].textContent;
        });
      });

      agenciesBody.querySelectorAll('.btn-delete-agency').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!window.confirm('Supprimer cette agence ?')) return;
          try {
            await apiDeleteAgency(btn.dataset.id);
            await loadAgencies();
          } catch (e) {
            showError(adminError, e.message);
          }
        });
      });
    } catch (e) {
      showError(adminError, e.message);
    }
  }

  async function loadUsers() {
    try {
      const { data } = await apiGetUsers();
      usersBody.innerHTML = '';
      data.forEach((u) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
          <td>
            <select data-id="${u.id}" class="user-role-select">
              <option value="client" ${u.role === 'client' ? 'selected' : ''}>client</option>
              <option value="agent" ${u.role === 'agent' ? 'selected' : ''}>agent</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
            </select>
          </td>
        `;
        usersBody.appendChild(tr);
      });

      usersBody.querySelectorAll('.user-role-select').forEach((sel) => {
        sel.addEventListener('change', async () => {
          try {
            await apiChangeUserRole(sel.dataset.id, sel.value);
          } catch (e) {
            showError(adminError, e.message);
          }
        });
      });
    } catch (e) {
      showError(adminError, e.message);
    }
  }

  agencyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(adminError);
    const payload = {
      name: agencyNameInput.value,
      city: agencyCityInput.value,
    };
    try {
      if (agencyIdInput.value) {
        await apiUpdateAgency(agencyIdInput.value, payload);
      } else {
        await apiCreateAgency(payload);
      }
      agencyIdInput.value = '';
      agencyForm.reset();
      await loadAgencies();
    } catch (e2) {
      showError(adminError, e2.message);
    }
  });

  resetAgencyBtn.addEventListener('click', () => {
    agencyIdInput.value = '';
    agencyForm.reset();
  });

  await loadStats();
  await loadAgencies();
  await loadUsers();
});

