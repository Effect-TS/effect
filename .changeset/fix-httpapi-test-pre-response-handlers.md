---
"effect": patch
---

Run registered pre-response handlers in `HttpApiTest` before returning responses, so hook-added headers and cookies are visible to the test client. Handler defects continue to propagate rather than becoming HTTP 500 responses.
