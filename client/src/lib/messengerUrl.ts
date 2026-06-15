/** Messenger webapp at gHosted.u (opened from alt.dream Messages). */
export function getMessengerAppUrl(): string {
  return import.meta.env.VITE_MESSENGER_URL?.replace(/\/$/, "") || "https://gHosted.u";
}
