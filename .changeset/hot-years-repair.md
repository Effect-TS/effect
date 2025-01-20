---
"@effect/platform": patch
---

ensure toWebHandler context argument is a Context before using it

Fixes issues with next.js where they supply a different second argument to request handlers
