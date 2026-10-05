---
"effect": patch
---

Read `HttpClientResponse.cookies` on platforms whose `Headers` has no `getSetCookie`, such as React Native, instead of throwing.
