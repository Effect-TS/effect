---
"@effect/platform": patch
---

Fix `retryTransient` to use correct transient status codes

Changed `isTransientResponse` from `status >= 429` to an explicit allowlist (408, 429, 500, 502, 503, 504). This correctly excludes 501 (Not Implemented) and 505+ permanent errors, while including 408 (Request Timeout) which was previously missed.

Also aligned response retry behavior with v4: the `while` predicate now only applies to error retries, not response retries. Response retries are determined solely by `isTransientResponse`. This matches the semantic intent since `while` is typed for errors, not responses.

Fixes #5995
