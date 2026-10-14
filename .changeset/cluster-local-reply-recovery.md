---
"effect": patch
---

Recover persisted local cluster replies from storage to prevent requests hanging when replies arrive before handler registration. Retain local reply notifications as storage-reader wakeups for low-latency streaming.

Defer terminal in-memory reply publication until the successful outer transaction completes, preserving the commit boundary for reply readers.
