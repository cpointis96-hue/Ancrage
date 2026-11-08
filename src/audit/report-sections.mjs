const corrections = {
  HTTP_ERROR: ['Page en erreur', 'Corriger la réponse serveur si cette page doit rester accessible ; sinon mettre à jour les liens qui y renvoient.', 'Permettre aux clients et aux moteurs d’accéder aux pages utiles.'],
  NOINDEX_OBSERVED: ['Directive de non-indexation observée', 'Vérifier si cette page doit être visible dans Google avant de modifier la directive noindex.', 'Distinguer les pages privées ou inutiles des pages commerciales à rendre découvrables.'],
  MISSING_TITLE: ['Titre de page absent', 'Rédiger un titre unique décrivant la page, l’activité et la localité si elles sont pertinentes.', 'Faciliter la compréhension de la page dans les résultats de recherche.'],
  MISSING_META_DESCRIPTION: ['Description absente', 'Ajouter une description propre à cette page, fondée sur son offre réelle.', 'Donner envie de consulter la page sans promettre un meilleur classement.'],
  MISSING_VIEWPORT: ['Affichage mobile à vérifier', 'Ajouter une déclaration viewport et tester les éléments au format mobile.', 'Permettre la lecture et les actions sur téléphone.'],
  MISSING_HTML_LANG: ['Langue non déclarée', 'Déclarer la langue du document avec html lang.', 'Aider les technologies d’assistance à prononcer le contenu.'],
  MISSING_IMAGE_ALT: ['Images sans attribut alt', 'Décrire les images informatives ; utiliser alt vide pour les images décoratives.', 'Rendre les images accessibles aux lecteurs d’écran.'],
};

export function technicalActions(findings) {
  const order = ['HTTP_ERROR', 'NOINDEX_OBSERVED', 'MISSING_TITLE', 'MISSING_VIEWPORT', 'MISSING_IMAGE_ALT', 'MISSING_HTML_LANG', 'MISSING_META_DESCRIPTION'];
  return [...Map.groupBy(findings.filter(item => order.includes(item.code)), item => item.code)]
    .sort(([left], [right]) => order.indexOf(left) - order.indexOf(right))
    .map(([code, rows]) => {
      const [title, action, impact] = corrections[code];
      return { type: 'action', title, action, impact, detail: rows[0].detail ?? title, urls: [...new Set(rows.map(item => item.url).filter(Boolean))] };
    });
}

export function readableLimit(code) {
  if (/DATAFORSEO_|HTTP_402/.test(code)) return 'Les mesures complémentaires de visibilité n’ont pas pu être obtenues.';
  if (/AI_WEB_|AI_OBSERVATIONS/.test(code)) return 'La recherche publique ne permet pas de compléter toutes les conclusions.';
  if (/SITE_NOT_CONFIRMED/.test(code)) return 'Le site officiel n’est pas confirmé.';
  if (/ESTABLISHMENT/.test(code)) return 'La fiche de l’établissement n’a pas pu être confirmée.';
  if (code === 'PAGE_LIMIT_REACHED') return 'Les conclusions portent sur un échantillon de pages.';
  return 'Une partie des vérifications n’a pas pu être réalisée.';
}
