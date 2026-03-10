const STORAGE_KEY_USER = 'yplaza_user';

function getCurrentUser() {
  const raw = window.localStorage.getItem(STORAGE_KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  if (!user) {
    window.localStorage.removeItem(STORAGE_KEY_USER);
  } else {
    window.localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  }
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function userHasRole(roles) {
  const user = getCurrentUser();
  if (!user) return false;
  return roles.includes(user.role);
}

function requireRoleOnPage(roles) {
  const ok = userHasRole(roles);
  if (!ok) {
    window.location.href = './login.html';
  }
}

async function syncUserFromServer() {
  try {
    const { user } = await apiMe();
    if (user) {
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
    }
  } catch (e) {
    // En cas d’erreur, on garde l’état local
  }
}

function updateNavForUser() {
  const user = getCurrentUser();
  const navAuth = document.getElementById('nav-auth');
  const navDashboard = document.getElementById('nav-dashboard');
  const navAdmin = document.getElementById('nav-admin');
  const btnLogout = document.getElementById('btn-logout');

  if (!navAuth || !btnLogout) return;

  if (user) {
    navAuth.textContent = user.name || 'Mon compte';
    navAuth.href = user.role === 'admin' ? './admin.html' : './dashboard-agent.html';
    btnLogout.style.display = 'inline-flex';
  } else {
    navAuth.textContent = 'Se connecter';
    navAuth.href = './login.html';
    btnLogout.style.display = 'none';
  }

  if (navDashboard) {
    navDashboard.style.display = user && (user.role === 'agent' || user.role === 'admin')
      ? 'inline-flex'
      : 'none';
  }
  if (navAdmin) {
    navAdmin.style.display = user && user.role === 'admin' ? 'inline-flex' : 'none';
  }
}

async function handleLogoutClick() {
  try {
    await apiLogout();
  } catch (e) {
    // ignorer
  }
  setCurrentUser(null);
  window.location.href = './index.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  await syncUserFromServer();
  updateNavForUser();

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogoutClick);
  }

  const footerYear = document.getElementById('footer-year');
  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }
});

