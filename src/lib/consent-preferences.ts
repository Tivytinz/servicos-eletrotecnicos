export type ConsentPreferences = {
  analytics: boolean;
  ads: boolean;
};

export const CONSENT_V2_KEY = "eletrotecnico_go_consent_v2";
export const LEGACY_CONSENT_KEY = "eletrotecnico_go_analytics_consent";
export const CONSENT_CHANGE_EVENT = "eletrotecnico_go_consent_change";

export const DENIED_PREFERENCES: ConsentPreferences = {
  analytics: false,
  ads: false,
};

export function normalizePreferences(value: ConsentPreferences): ConsentPreferences {
  return {
    analytics: value.analytics,
    // GA4 is the only conversion tag: enabling ads measurement requires Analytics.
    ads: value.analytics && value.ads,
  };
}

export function encodePreferences(value: ConsentPreferences): string {
  return JSON.stringify({ version: 2, ...normalizePreferences(value) });
}

export function decodeConsentSnapshot(snapshot: string): {
  preferences: ConsentPreferences;
  needsChoice: boolean;
} {
  if (snapshot.startsWith("v2:")) {
    try {
      const stored: unknown = JSON.parse(snapshot.slice(3));
      if (
        stored !== null && typeof stored === "object" &&
        "version" in stored && stored.version === 2 &&
        "analytics" in stored && typeof stored.analytics === "boolean" &&
        "ads" in stored && typeof stored.ads === "boolean"
      ) {
        return {
          preferences: normalizePreferences({
            analytics: stored.analytics,
            ads: stored.ads,
          }),
          needsChoice: false,
        };
      }
    } catch {
      // Invalid stored consent must not grant anything.
    }
  }

  // Older "accepted" only covered Analytics. Never infer ads authorization.
  if (snapshot === "legacy:accepted") {
    return { preferences: { analytics: true, ads: false }, needsChoice: true };
  }
  // Honor prior refusal without forcing a new prompt.
  if (snapshot === "legacy:rejected") {
    return { preferences: DENIED_PREFERENCES, needsChoice: false };
  }
  return { preferences: DENIED_PREFERENCES, needsChoice: true };
}

export function googleConsentFlags(preferences: ConsentPreferences) {
  const normalized = normalizePreferences(preferences);
  return {
    analytics_storage: normalized.analytics ? "granted" : "denied",
    ad_storage: normalized.ads ? "granted" : "denied",
    ad_user_data: normalized.ads ? "granted" : "denied",
    // Ads measurement does not imply remarketing/personalized advertising.
    ad_personalization: "denied",
  } as const;
}
