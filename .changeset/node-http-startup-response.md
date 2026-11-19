---
"@effect/platform-node": patch
---

Return HTTP 503 for requests received by `NodeHttpServer` before the application starts serving instead of leaving them unanswered.
