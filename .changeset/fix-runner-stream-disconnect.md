---
"effect": patch
---

Bind non-persisted `RunnerServer` requests to their caller's scope, so a caller that disconnects releases the entity handler and its mailbox slot instead of leaking them. Requests annotated `Uninterruptible` and persisted requests keep their existing behavior, and explicit interrupts are unaffected.
