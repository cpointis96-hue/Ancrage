export const observationInput = {
  name: 'SIMULATION : Maison Sillage', city: { id: 'fr-nantes', label: 'Nantes', country: 'FR' },
  domain: 'https://sillage.example', domainSource: 'google-places',
  identity: { source: 'google-places', placeId: 'fixture-place', address: 'Adresse de fixture, Nantes', primaryType: 'restaurant' },
};

export const observationOutput = {
  observations: [{ id: 'web-source-1', url: 'https://voisin.example/menu', fact: 'Le concurrent publie une page de menu accessible.', quote: 'Consulter le menu' }],
  priorities: [
    { title: 'Faciliter le contact', observationIds: ['local-page-1'], consequence: 'Le visiteur doit retrouver comment vous joindre.', correction: 'Vérifier le lien de contact sur téléphone.', limitation: 'Lien HTML observé ; appel réel non testé.' },
    { title: 'Comparer l’accès au menu', observationIds: ['web-source-1'], consequence: 'Le visiteur cherche les informations avant de choisir.', correction: 'Comparer le nombre d’étapes pour consulter le menu.', limitation: 'Comparaison publique de fixture, sans mesure de conversion.' },
    { title: 'Confirmer les informations pratiques', observationIds: ['local-identity'], consequence: 'Une adresse cohérente aide à préparer la visite.', correction: 'Comparer l’adresse publiée avec celle de la fiche.', limitation: 'La sélection ne prouve pas la propriété de la fiche.' },
  ],
  competitors: [{ name: 'SIMULATION : voisin', url: 'https://voisin.example/menu', comparison: 'Le menu est présenté sur une page dédiée dans cette fixture.' }],
  queries: [{ query: 'restaurant Nantes', intent: 'Trouver un restaurant', targetPage: 'Accueil', reason: 'Catégorie et localité de la fixture.' }],
  conclusion: { decision: 'KEEP_SITE', reason: 'Les éléments de cette simulation ne justifient pas une refonte.', observationIds: ['local-page-1'] },
  limitations: ['Simulation de recette, aucune donnée commerciale réelle.'],
};

export function observationResponse(output = structuredClone(observationOutput)) {
  return { output, sources: [{ url: 'https://voisin.example/menu' }], searchCalls: 1, completed: true, usage: { input_tokens: 1000, output_tokens: 500, input_tokens_details: { cached_tokens: 0 } } };
}

export function fixtureHtml() {
  return new Response('<html lang="fr"><title>Maison Sillage</title><meta name="viewport" content="width=device-width"><h1>Restaurant de fixture</h1><a href="tel:+33000000000">Téléphone de fixture</a></html>', { headers: { 'content-type': 'text/html' } });
}
