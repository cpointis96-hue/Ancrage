document.querySelector('#operator-logout')?.addEventListener('click', async () => {
  const response = await fetch('/api/operator/logout', { method: 'POST' });
  if (response.ok) location.replace('/cockpit');
});
