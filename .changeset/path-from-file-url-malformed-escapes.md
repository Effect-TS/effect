---
"effect": patch
---

Fix `Path.fromFileUrl` throwing a `URIError` instead of failing with `BadArgument` when the URL contains a malformed percent-encoding.
