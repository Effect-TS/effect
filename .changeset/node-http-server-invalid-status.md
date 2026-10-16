---
"@effect/platform-node": patch
---

Answer with a 500 when a handler responds with a status outside 200–599 in `NodeHttpServer`, instead of leaving the client without a final response.
