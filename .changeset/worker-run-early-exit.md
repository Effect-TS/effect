---
"effect": patch
---

Fix `Worker.run` hanging uninterruptibly when a worker dies before the ready handshake. The ready wait now races the worker's failure signal, so an early exit fails `run` with a `WorkerError`, and the wait is interruptible.
