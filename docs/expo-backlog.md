# Expo — deferred list

Keep this list separate from current web fixes. Do not start the mobile build until requested.

## Sharing
- Open shared-title URLs directly in the installed app using iOS Universal Links and Android App Links.
- Retain the shared-title webpage as the fallback for people without the app.

## Sign-in experience
- Resolve the existing server-side refresh failures before reusing the authentication backend.
- Design persistent, secure sign-in with silent renewal and restore it when reopening the app.
- Decide whether users should sign in through Replit or use Hotlist-branded sign-in before building mobile authentication.
- Validate reopening after inactivity, token renewal, shared links, reinstall, and genuine session revocation on devices.
- Do not promise that users will never need to sign in again; legitimate expiry, revocation, and security events still require authentication.
