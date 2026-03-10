document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const registerForm = document.getElementById('register-form');
  const registerError = document.getElementById('register-error');
  const registerSuccess = document.getElementById('register-success');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(loginError);
    const formData = new FormData(loginForm);
    const payload = {
      email: formData.get('email'),
      password: formData.get('password'),
    };
    try {
      const { user } = await apiLogin(payload);
      setCurrentUser(user);
      if (user.role === 'admin') {
        window.location.href = './admin.html';
      } else if (user.role === 'agent') {
        window.location.href = './dashboard-agent.html';
      } else {
        window.location.href = './index.html';
      }
    } catch (e2) {
      showError(loginError, e2.message);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError(registerError);
    registerSuccess.style.display = 'none';
    const formData = new FormData(registerForm);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    };
    try {
      const { user } = await apiRegister(payload);
      setCurrentUser(user);
      registerSuccess.textContent = 'Compte créé avec succès. Vous êtes maintenant connecté.';
      registerSuccess.style.display = 'block';
      window.setTimeout(() => {
        window.location.href = './index.html';
      }, 800);
    } catch (e2) {
      showError(registerError, e2.message);
    }
  });
});

