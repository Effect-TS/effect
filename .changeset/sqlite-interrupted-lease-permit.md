---
"effect": patch
---

Fix a SQLite client hanging forever after a queued `withTransaction` or `reserve` was interrupted just as it received the connection. The interrupted acquisition could keep the connection's only permit without registering its release.
