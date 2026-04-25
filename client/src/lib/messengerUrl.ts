/** URL of the gHosted.u messenger app (for links from alt.dream). */
export function getMessengerAppUrl(): string {
  return import.meta.env.VITE_MESSENGER_URL?.replace(/\/$/, "") || "https://gHosted.u";
}
