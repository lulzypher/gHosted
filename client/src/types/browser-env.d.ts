/// <reference lib="dom" />
/// <reference lib="webworker" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `messenger` = Ghost messaging add-on (default); anything else = legacy experimental social bundle. */
  readonly VITE_APP_MODE?: string;
  /** Where the alt.dream browser should link for the full gHosted inbox (optional deploy URL). */
  readonly VITE_MESSENGER_URL?: string;
}

export {};