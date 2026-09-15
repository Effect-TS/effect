---
"effect": patch
---

Preserve literal action suffixes such as `/operations/:id:wait` in `HttpApiClient` requests and URL builders by substituting only declared path parameters when the schema exposes a finite set of encoded keys.
