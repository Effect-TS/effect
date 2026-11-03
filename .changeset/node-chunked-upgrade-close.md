---
"@effect/platform-node": patch
---

Fix `NodeHttpServer` shutdown hanging when an upgrade request is refused or answered with a regular HTTP response and the client sends more bytes afterwards.
