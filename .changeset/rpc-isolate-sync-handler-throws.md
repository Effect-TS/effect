---
"effect": patch
---

Treat synchronous throws from RPC handlers as request-level defects, so `disableFatalDefects: true` fails only the throwing request instead of every pending request on the client.
