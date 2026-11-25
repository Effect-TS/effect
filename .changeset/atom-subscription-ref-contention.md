---
"effect": patch
---

Fix `Atom.subscriptionRef` setters throwing `AsyncFiberError` when another update holds the ref lock.
