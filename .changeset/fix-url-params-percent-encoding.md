---
"@effect/platform": patch
---

Preserve percent-encoding (`%20`) in `Url.modifyUrlParams` and `Url.setUrlParams`. Previously these functions used `URLSearchParams.toString()` which converts spaces to `+` per the `application/x-www-form-urlencoded` spec, silently mutating URLs. Added `UrlParams.toStringPercent` using RFC 3986 percent-encoding for URL context, while keeping the existing `toString` for form body encoding.
