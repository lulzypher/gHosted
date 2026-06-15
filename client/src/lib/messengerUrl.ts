/** URL of the gHosted messaging add-on (for links from the alt.dream browser). */
export function getMessengerAppUrl(): string {
  return import.meta.env.VITE_MESSENGER_URL?.replace(/\/$/, "") || "https://gHosted.u";
}
