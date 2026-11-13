---
"effect": patch
---

Fix `Semaphore` taking time proportional to the square of its queue length. A release no longer copies the whole queue, and a request that starts waiting no longer searches it when no permit is free.
