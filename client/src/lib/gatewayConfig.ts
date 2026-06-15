/** alt.dream gateway base URL (includes /v1 prefix path via getGatewayApiBase). */
export function getGatewayOrigin(): string {
  const env = import.meta.env.VITE_GATEWAY_URL?.replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return `${window.location.origin}/gw`;
  }
  return "http://127.0.0.1:8787";
}

export function getGatewayApiBase(): string {
  const origin = getGatewayOrigin();
  return origin.endsWith("/v1") ? origin : `${origin}/v1`;
}
