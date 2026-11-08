// Conservative list tariff, excluding any account-specific free tier or discount.
// https://developers.google.com/maps/billing-and-pricing/pricing (2026-11-08)
const DETAILS_COST = 0.025;

export function createGoogleProfileReader({ providers, adapters, secretStore }) {
  return async ({ placeId, ledger }) => {
    const unavailable = cause => ({ status: 'PARTIAL', cause });
    const provider = (await providers.list()).find(item => item.id === 'google-places');
    if (!provider?.enabled || !provider.configured || provider.health !== 'healthy' || !adapters.googlePlaces?.auditDetails) return unavailable('GOOGLE_PROFILE_NOT_CONFIGURED');
    let authorization;
    try {
      authorization = await ledger.authorize({ stepId: 'google-profile-details', provider: 'google-places', unit: 'request', quantity: 1, estimatedCost: DETAILS_COST, essential: true });
    } catch (error) { return unavailable(error.code ?? 'GOOGLE_PROFILE_BUDGET_UNAVAILABLE'); }
    try {
      const value = await adapters.googlePlaces.auditDetails({ secret: await secretStore.get('provider:google-places'), placeId });
      await ledger.settle({ authorizationId: authorization.authorizationId, actualCost: DETAILS_COST });
      if (value.id !== placeId) return unavailable('GOOGLE_PROFILE_ID_MISMATCH');
      return { status: 'SUCCEEDED', profile: {
        placeId, title: value.displayName?.text ?? null, address: value.formattedAddress ?? null,
        phone: value.internationalPhoneNumber ?? null, website: value.websiteUri ?? null,
        category: value.primaryTypeDisplayName?.text ?? null, businessStatus: value.businessStatus ?? null,
        url: value.googleMapsUri ?? null, rating: value.rating ?? null, reviewCount: value.userRatingCount ?? null,
        hours: value.regularOpeningHours?.weekdayDescriptions ?? [],
        currentHours: value.currentOpeningHours?.weekdayDescriptions ?? [],
        reviews: (value.reviews ?? []).slice(0, 5).map(item => ({ rating: item.rating ?? null, text: item.originalText?.text ?? item.text?.text ?? '', publishedAt: item.publishTime ?? null, author: item.authorAttribution?.displayName ?? null, authorUrl: item.authorAttribution?.uri ?? null, url: item.googleMapsUri ?? null })),
        reviewScope: 'Échantillon de cinq avis au maximum, sélectionnés par Google selon leur pertinence ; il ne représente pas tous les avis.',
      } };
    } catch (error) {
      if (/^HTTP_4\d\d$/.test(error.code ?? '')) await ledger.cancel({ authorizationId: authorization.authorizationId, reason: error.code });
      return unavailable(error.code ?? 'GOOGLE_PROFILE_COST_RECONCILIATION_REQUIRED');
    }
  };
}
