---
"effect": patch
---

Encode `HttpClientRequest.basicAuth` credentials as UTF-8 before base64 encoding, so non-ASCII usernames and passwords no longer throw or get mangled.
