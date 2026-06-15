const PREFS_KEY = "ghost_chat_prefs_v1";

export type ContactPrefs = {
  contactDid: string;
  schemeId: string;
  config?: { passphraseHint?: string };
};

export type UserChatSettings = {
  defaultEncryptionScheme: string;
  showLinkPreviews: boolean;
};

const DEFAULT_SETTINGS: UserChatSettings = {
  defaultEncryptionScheme: "aes-gcm-passphrase",
  showLinkPreviews: true,
};

export function loadUserSettings(): UserChatSettings {
  try {
    const raw = localStorage.getItem(`${PREFS_KEY}:settings`);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function loadContactPrefs(did: string): ContactPrefs | null {
  try {
    const raw = localStorage.getItem(`${PREFS_KEY}:contact:${did}`);
    return raw ? (JSON.parse(raw) as ContactPrefs) : null;
  } catch {
    return null;
  }
}

export function saveContactPrefs(prefs: ContactPrefs): void {
  localStorage.setItem(`${PREFS_KEY}:contact:${prefs.contactDid}`, JSON.stringify(prefs));
}
