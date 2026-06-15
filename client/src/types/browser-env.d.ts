/// <reference lib="dom" />
/// <reference lib="webworker" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `messenger` = gHosted.u webapp (default); else legacy experimental social bundle. */
  readonly VITE_APP_MODE?: string;
  /** alt.dream gateway origin — dev default proxies `/gw` → `:8787/v1`. */
  readonly VITE_GATEWAY_URL?: string;
  readonly VITE_MESSENGER_URL?: string;
}

export {};