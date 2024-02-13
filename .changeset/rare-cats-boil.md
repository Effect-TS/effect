---
"@effect/platform-browser": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform": minor
---

add Scope to Http client

This change adds a scope to the default http client, ensuring connections are
cleaned up if you abort the request at any point.
