---
"effect": patch
"@effect/platform-browser": patch
---

`HttpClient.withScope` now owns every request sent while the scoped client executes, instead of tracking the request value.
