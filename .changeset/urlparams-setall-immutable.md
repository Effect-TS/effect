---
"effect": patch
---

Keep UrlParams.setAll overrides immutable so reusing them across requests does not retain parameters from earlier calls.
