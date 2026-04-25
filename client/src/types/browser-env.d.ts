/// <reference lib="dom" />
/// <reference lib="webworker" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `messenger` = gHosted.u client; anything else = alt.dream (social) client. */
  readonly VITE_APP_MODE?: string;
  /** Where alt.dream should link for DMs (default https://gHosted.u). */
  readonly VITE_MESSENGER_URL?: string;
}

export {};