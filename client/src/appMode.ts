/** Set at build time via `VITE_APP_MODE` (see `package.json` build scripts). */
export const isMessengerApp = import.meta.env.VITE_APP_MODE === "messenger";
export const isAltdreamApp = import.meta.env.VITE_APP_MODE !== "messenger";
