---
"effect": patch
---

Make `HttpApiClient` close the upgraded connection of an `HttpApiSchema.Upgrade` endpoint when the `101` response headers fail to decode, instead of leaving it open.
