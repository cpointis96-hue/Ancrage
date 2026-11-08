const form = document.querySelector('#login');
const button = form.querySelector('button');
const error = document.querySelector('#error');
form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true;
  error.textContent = '';
  try {
    const response = await fetch('/api/operator/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: form.elements.password.value }),
    });
    if (response.ok) { form.reset(); location.replace('/cockpit'); return; }
    error.textContent = response.status === 429 ? 'Trop de tentatives. Réessaie dans quinze minutes.' : response.status === 401 ? 'Mot de passe incorrect.' : 'Connexion indisponible. Réessaie plus tard.';
  } catch { error.textContent = 'Connexion impossible. Vérifie ton accès Internet.'; }
  finally { button.disabled = false; }
});
