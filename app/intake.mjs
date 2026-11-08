import { api } from './api.mjs';

const nav = document.querySelector('.client-nav');
const menuButton = document.querySelector('.menu-button');
const auditForm = document.querySelector('#audit-form');
const auditState = document.querySelector('#audit-state');
const dossierSection = document.querySelector('#dossier-section');
const dossierForm = document.querySelector('#dossier-form');
const photoInput = document.querySelector('#photo');
const preview = document.querySelector('#photo-preview');
const dossierState = document.querySelector('#dossier-state');

function setupAutocomplete(input, list, mode, onSelect) {
  let controller; let sequence = 0; let suggestions = []; let activeIndex = -1;
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); activeIndex = -1; };
  const render = items => {
    suggestions = items; list.replaceChildren();
    items.forEach((item, index) => {
      const option = document.createElement('li'); option.id = `${list.id}-option-${index}`; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false'); option.textContent = item.label;
      option.addEventListener('pointerdown', event => { event.preventDefault(); onSelect(item); close(); }); list.append(option);
    });
    list.hidden = items.length === 0; input.setAttribute('aria-expanded', String(items.length > 0));
  };
  const search = async () => {
    const query = input.value.trim(); sequence += 1; const current = sequence; controller?.abort();
    if (query.length < 2) return close();
    controller = new AbortController();
    try {
      const result = await api.placesAutocomplete({ input: query, mode, signal: controller.signal });
      if (current !== sequence) return;
      render(result.suggestions ?? []);
      if (result.status === 'PARTIAL') auditState.textContent = 'Suggestions indisponibles. Vérifiez Google Places dans Providers.';
      else if (!result.suggestions?.length) auditState.textContent = 'Aucune suggestion trouvée. Complétez votre recherche.';
      else auditState.textContent = '';
      auditState.classList.toggle('show', Boolean(auditState.textContent));
    } catch (error) {
      if (error.name !== 'AbortError' && current === sequence) {
        close();
        auditState.textContent = 'La recherche de lieux a échoué. Vérifiez Google Places dans Providers.';
        auditState.classList.add('show');
      }
    }
  };
  let timer;
  input.addEventListener('input', () => { auditState.textContent = ''; auditState.classList.remove('show'); clearTimeout(timer); timer = setTimeout(search, 250); });
  input.addEventListener('keydown', event => {
    if (list.hidden || !suggestions.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); activeIndex = (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length; [...list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === activeIndex))); input.setAttribute('aria-activedescendant', `${list.id}-option-${activeIndex}`); }
    if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); onSelect(suggestions[activeIndex]); close(); }
    if (event.key === 'Escape') close();
  });
  input.addEventListener('blur', () => setTimeout(close, 120));
}

const establishmentInput = document.querySelector('#establishment');
const locationInput = document.querySelector('#location');
setupAutocomplete(establishmentInput, document.querySelector('#establishment-suggestions'), 'establishment', async suggestion => {
  establishmentInput.value = suggestion.primaryText || suggestion.label; establishmentInput.dataset.placeId = suggestion.placeId || '';
  if (!suggestion.placeId) return;
  try { const result = await api.placeDetails(suggestion.placeId); if (result.establishment?.cityLabel) locationInput.value = result.establishment.cityLabel; } catch { /* the selected name remains usable */ }
});
setupAutocomplete(locationInput, document.querySelector('#location-suggestions'), 'city', suggestion => { locationInput.value = suggestion.primaryText || suggestion.label; });

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

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('menu-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

auditForm.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(auditForm);
  const name = String(data.get('name')).trim();
  const city = String(data.get('city')).trim();
  if (!name || !city) return;
  const selected = establishmentInput.dataset.placeId;
  if (!selected) { auditState.textContent = 'Sélectionnez un établissement proposé.'; auditState.classList.add('show'); return; }
  const params = new URLSearchParams({ placeId: selected, name, city, auto: '1' });
  window.location.href = `/demo.html?${params}`;
});

photoInput.addEventListener('change', async () => {
  dossierState.textContent = '';
  preview.hidden = true;
  preview.replaceChildren();
  const file = photoInput.files[0];
  if (!file) return;
  if (file.size > 700 * 1024) { dossierState.textContent = 'Cette image dépasse 700 Ko.'; photoInput.value = ''; return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { dossierState.textContent = 'Format d’image non autorisé.'; photoInput.value = ''; return; }
  const image = document.createElement('img');
  image.src = await imageData(file);
  image.alt = 'Aperçu de l’image sélectionnée';
  preview.append(image);
  preview.hidden = false;
});

dossierForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = dossierForm.querySelector('button[type="submit"]');
  const identity = new FormData(auditForm);
  const data = new FormData(dossierForm);
  button.disabled = true;
  dossierState.textContent = 'Enregistrement…';
  try {
    const file = photoInput.files[0];
    const profile = {
      name: String(identity.get('name')).trim(),
      city: String(identity.get('city')).trim(),
      country: data.get('country'),
      address: data.get('address'),
      contact: data.get('contact'),
      story: data.get('story'),
      menu: parseMenu(String(data.get('menu') ?? '')),
    };
    if (file) profile.photo = { dataUrl: await imageData(file), alt: `Image de ${profile.name}` };
    await api.createIntake(profile);
    dossierForm.hidden = true;
    dossierSection.querySelector('.section-grid').hidden = true;
    document.querySelector('#intake-success').hidden = false;
    document.querySelector('#intake-success').focus();
  } catch (error) {
    dossierState.textContent = error.message;
    button.disabled = false;
  }
});
