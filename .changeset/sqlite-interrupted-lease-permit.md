---
"effect": minor
---

Fix a SQLite client hanging forever after a queued `withTransaction` or `reserve` was interrupted just as it received the connection. The interrupted acquisition could keep the connection's only permit without registering its release.

Add `Semaphore.takeScoped`, which holds permits until the current scope closes. Waiting can be interrupted unless the caller is uninterruptible, and acquired permits are always returned when the scope closes.
