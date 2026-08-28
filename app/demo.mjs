const form = document.querySelector('#demo-form');
const state = document.querySelector('#demo-state');
const result = document.querySelector('#demo-result');
const progress = document.querySelector('#demo-progress');
const name = form.elements.name;
const manualPanel = document.querySelector('#manual-panel');
const manualToggle = document.querySelector('#manual-toggle');
const country = form.elements.countryCode;
const city = form.elements.cityLabel;
const establishmentOptions = document.querySelector('#establishment-options');
const cityOptions = document.querySelector('#city-options');
const cities = { FR: ['Nantes', 'Paris', 'Lyon'], LK: ['Colombo', 'Galle', 'Kandy'] };
let suggestedEstablishments = [];
let suggestedCities = [];
let selectedEstablishment = null;
let selectedCity = null;
let searchTimer;

let activeSuggestionIndex = -1;
function options(target, items, type) {
  target.replaceChildren(...items.map((item, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'suggestion'; button.dataset.index = String(index); button.setAttribute('role', 'option'); const primary = document.createElement('span'); primary.textContent = item.primaryText || item.label; button.append(primary); if (item.secondaryText) { const secondary = document.createElement('small'); secondary.textContent = item.secondaryText; button.append(secondary); }
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => selectSuggestion(type, item));
    return button;
  }));
  activeSuggestionIndex = -1; target.hidden = items.length === 0;
}
function closeSuggestions(target, input) { target.hidden = true; input.setAttribute('aria-expanded', 'false'); activeSuggestionIndex = -1; }
function openSuggestions(target, input) { if (target.childElementCount) { target.hidden = false; input.setAttribute('aria-expanded', 'true'); } }
function selectSuggestion(type, item) {
  if (type === 'establishment') { selectedEstablishment = item; name.value = item.label; closeSuggestions(establishmentOptions, name); }
  else { selectedCity = item; city.value = item.primaryText || item.label; closeSuggestions(cityOptions, city); }
}
function moveSuggestion(input, target, direction) {
  const items = [...target.querySelectorAll('.suggestion')]; if (!items.length) return;
  activeSuggestionIndex = (activeSuggestionIndex + direction + items.length) % items.length;
  items.forEach((item, index) => item.setAttribute('aria-selected', String(index === activeSuggestionIndex)));
}
function handleSuggestionKeys(event, input, target, type) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openSuggestions(target, input); moveSuggestion(input, target, event.key === 'ArrowDown' ? 1 : -1); }
  else if (event.key === 'Enter' && !target.hidden && activeSuggestionIndex >= 0) { event.preventDefault(); selectSuggestion(type, (type === 'establishment' ? suggestedEstablishments : suggestedCities)[activeSuggestionIndex]); }
  else if (event.key === 'Escape') closeSuggestions(target, input);
}
function manualMode() { return !manualPanel.hidden; }
function setManual(open) { manualPanel.hidden = !open; manualToggle.setAttribute('aria-expanded', String(open)); city.disabled = !open; if (!open) { country.value = ''; city.value = ''; selectedCity = null; closeSuggestions(cityOptions, city); } }
function cityId() { return `demo-${country.value.toLowerCase()}-${city.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`; }

manualToggle.addEventListener('click', () => setManual(manualPanel.hidden));
country.addEventListener('change', () => { city.value = ''; selectedCity = null; suggestedCities = []; closeSuggestions(cityOptions, city); city.disabled = !country.value; });

name.addEventListener('input', () => {
  selectedEstablishment = null;
  clearTimeout(searchTimer);
  const query = name.value.trim();
  closeSuggestions(establishmentOptions, name); if (query.length < 2 || manualMode()) return;
  searchTimer = setTimeout(async () => {
    try {
      const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}&mode=establishment`);
      const body = await response.json(); suggestedEstablishments = body.suggestions ?? []; options(establishmentOptions, suggestedEstablishments, 'establishment'); openSuggestions(establishmentOptions, name);
    } catch { suggestedEstablishments = []; }
  }, 180);
});
name.addEventListener('keydown', event => handleSuggestionKeys(event, name, establishmentOptions, 'establishment'));
name.addEventListener('blur', () => setTimeout(() => closeSuggestions(establishmentOptions, name), 120));

city.addEventListener('input', () => {
  selectedCity = null; clearTimeout(searchTimer); closeSuggestions(cityOptions, city); const query = city.value.trim();
  if (query.length < 2 || !country.value) return;
  searchTimer = setTimeout(async () => {
    try { const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}&country=${encodeURIComponent(country.value)}&mode=city`); const body = await response.json(); suggestedCities = body.suggestions ?? []; options(cityOptions, suggestedCities, 'city'); openSuggestions(cityOptions, city); } catch { suggestedCities = []; }
  }, 180);
});
city.addEventListener('keydown', event => handleSuggestionKeys(event, city, cityOptions, 'city'));
city.addEventListener('blur', () => setTimeout(() => closeSuggestions(cityOptions, city), 120));

form.addEventListener('submit', async event => {
  event.preventDefault(); const button = form.querySelector('button[type="submit"]'); const data = new FormData(form); button.disabled = true; progress.hidden = false; state.textContent = 'Audit en cours…'; result.hidden = true;
  try {
    let payload;
    if (manualMode()) {
      const selectedCityLabel = String(data.get('cityLabel')); if (!country.value || !data.get('addressLine1') || !selectedCityLabel || (!selectedCity && !cities[country.value]?.includes(selectedCityLabel))) throw new Error('Complétez l’adresse et sélectionnez une ville proposée.');
      payload = { name: data.get('name'), city: { id: cityId(), label: selectedCityLabel, countryCode: country.value }, identity: { source: 'manual', address: { addressLine1: data.get('addressLine1'), addressLine2: data.get('addressLine2'), postalCode: data.get('postalCode'), city: selectedCityLabel, countryCode: country.value } } };
    } else {
      selectedEstablishment = selectedEstablishment ?? suggestedEstablishments.find(item => item.label === name.value) ?? null; if (!selectedEstablishment) throw new Error('Sélectionnez un établissement proposé.');
      const detailsResponse = await fetch(`/api/places/details?placeId=${encodeURIComponent(selectedEstablishment.placeId)}`); const detailsBody = await detailsResponse.json(); const establishment = detailsBody.establishment; if (!detailsResponse.ok || detailsBody.status !== 'SUCCEEDED' || !establishment?.cityLabel || !establishment.countryCode) throw new Error('Les détails de cet établissement sont indisponibles.');
      payload = { name: establishment.name, city: { id: `google-${establishment.placeId.replace(/[^a-z0-9]+/gi, '-')}`, label: establishment.cityLabel, countryCode: establishment.countryCode }, domain: establishment.websiteUri, identity: { source: 'google-places', placeId: establishment.placeId, address: establishment.formattedAddress } };
    }
    const response = await fetch('/api/demo/workbench/audits', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? 'Impossible de lancer l’audit.');
    state.textContent = body.audit.status === 'PARTIAL' ? 'Audit partiel. Consultez les limites du rapport.' : 'Audit terminé.'; result.innerHTML = `<h2>${body.profile.name}</h2><p>${body.audit.target} · ${body.audit.findingCount} finding(s)</p><a href="${body.artifacts.reportHref}" target="_blank" rel="noopener">Voir le rapport</a><a href="${body.artifacts.siteHref}" target="_blank" rel="noopener">Voir la démo du site</a>`; result.hidden = false;
  } catch (error) { state.textContent = error.message; } finally { button.disabled = false; progress.hidden = true; }
});
