---
"effect": patch
---

Install `runMain` signal handlers before the program's first synchronous segment, so that `SIGINT` / `SIGTERM` received during startup interrupts the main fiber and runs its finalizers.
