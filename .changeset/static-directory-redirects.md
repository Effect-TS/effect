---
"effect": patch
---

Redirect static directory index URLs without a trailing slash to their canonical form with a 301 response, preserving router prefixes and query strings so relative links resolve correctly. Clients that do not follow redirects must request the trailing-slash URL directly.
