---
"effect": patch
---

Preserve literal action suffixes such as `/operations/:id:wait` in `HttpApiClient` requests and URL builders by substituting only declared path parameters when the schema exposes a finite set of encoded keys.

Effect's server router still interprets adjacent `:id:wait` as a single parameter named `id:wait`, so this route cannot be decoded by `HttpApiBuilder` with only an `id` parameter. This client fix supports calling external APIs; server routing support for adjacent suffixes remains a separate limitation.
