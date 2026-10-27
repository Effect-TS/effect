---
"effect": patch
---

Fix `HttpStaticServer` dropping `Content-Location`, `Date`, `Expires` and `Vary` from 304 responses.
