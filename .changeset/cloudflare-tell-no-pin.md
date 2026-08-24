---
"@effect/platform-cloudflare": patch
---

Complete a persisted or volatile tell's invoke once the request is persisted and its handler forked, instead of pinning the caller until the handler finishes. Tells no longer block the calling Worker or entity on handler completion, matching the documented contract that only asks pin their caller.
