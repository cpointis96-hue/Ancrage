import { api } from './api.mjs';

const form = document.querySelector('#intake-form');
const photoInput = document.querySelector('#photo');
const preview = document.querySelector('#photo-preview');
const status = document.querySelector('#intake-status');

function imageData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result), { once: true });
    reader.addEventListener('error', () => reject(new Error('Impossible de lire cette image.')), { once: true });
    reader.readAsDataURL(file);
  });
}

function parseMenu(value) {
  return value.split('\n').map(line => line.trim()).filter(Boolean).map((line, index) => {
    const [name, rawPrice = ''] = line.split('|').map(part => part.trim());
    if (!name) throw new Error(`Plat invalide à la ligne ${index + 1}.`);
    const price = rawPrice === '' ? null : Number(rawPrice.replace(',', '.'));
    if (price !== null && !Number.isFinite(price)) throw new Error(`Prix invalide à la ligne ${index + 1}.`);
    return { name, price };
  });
}

photoInput.addEventListener('change', async () => {
  status.textContent = '';
  preview.hidden = true;
  preview.replaceChildren();
  const file = photoInput.files[0];
  if (!file) return;
  if (file.size > 700 * 1024) { status.textContent = 'Cette image dépasse 700 Ko.'; photoInput.value = ''; return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { status.textContent = 'Format d’image non autorisé.'; photoInput.value = ''; return; }
  const image = document.createElement('img');
  image.src = await imageData(file);
  image.alt = 'Aperçu de l’image sélectionnée';
  preview.append(image);
  preview.hidden = false;
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = 'Enregistrement…';
  try {
    const data = new FormData(form);
    const file = photoInput.files[0];
    const profile = {
      name: data.get('name'),
      city: data.get('city'),
      country: data.get('country'),
      address: data.get('address'),
      contact: data.get('contact'),
      story: data.get('story'),
      menu: parseMenu(data.get('menu')),
    };
    if (file) profile.photo = { dataUrl: await imageData(file), alt: `Image de ${profile.name}` };
    await api.createIntake(profile);
    form.hidden = true;
    document.querySelector('#intake-success').hidden = false;
    document.querySelector('#intake-success').focus?.();
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});
