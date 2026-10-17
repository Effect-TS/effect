---
"effect": patch
"@effect/platform-node": patch
---

Avoid loading Node.js internal undici when importing Schema or starting a Node HTTP server without using web APIs. Defer the FormData constructor lookup until validation and load Node HTTP modules without evaluating their lazy web API exports.
