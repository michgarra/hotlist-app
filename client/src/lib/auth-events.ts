export class AuthServiceUnavailableError extends Error {
  constructor() {
    super("Hotlist couldn't reconnect right now. Your saved list is safe. Please try again shortly.");
    this.name = "AuthServiceUnavailableError";
  }
}

export async function checkAuthUnavailable(response: Response): Promise<void> {
  if (response.status !== 503) return;
  const body = await response.clone().json().catch(() => null);
  if (body?.code !== "AUTH_TEMPORARILY_UNAVAILABLE") return;
  window.dispatchEvent(new CustomEvent("authTemporarilyUnavailable"));
  throw new AuthServiceUnavailableError();
}
