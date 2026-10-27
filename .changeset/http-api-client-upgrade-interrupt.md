---
"effect": patch
---

Make `HttpApiClient` close the upgraded connection of an `HttpApiSchema.Upgrade` endpoint when it is interrupted right after taking the upgrade, before its cleanup was in place.
