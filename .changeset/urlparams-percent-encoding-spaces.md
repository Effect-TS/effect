---
"@effect/platform": patch
---

Fix `UrlParams.toString` to encode spaces as `%20` instead of `+`, preserving percent-encoded spaces in `modifyUrlParams` and other URL utilities.
