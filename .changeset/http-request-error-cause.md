---
"effect": patch
---

HTTP client request errors now describe their cause in `message`, for example `Transport: fetch failed: getaddrinfo ENOTFOUND example.invalid (POST https://example.invalid/v1)` instead of `Transport error (POST https://example.invalid/v1)`. Sensitive header and query values are redacted from the description.
