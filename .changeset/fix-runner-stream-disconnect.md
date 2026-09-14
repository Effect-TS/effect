---
"effect": patch
---

Bind non-persisted `RunnerServer` requests to their caller's scope, so a caller that disconnects releases the entity handler and its mailbox slot instead of leaking them. Requests annotated `Uninterruptible` and persisted requests keep their existing behavior, and explicit interrupts are unaffected.

Preserve dynamic `WithTransaction` annotations when requests replay after an entity defect or are re-delivered after interruption, so those handlers continue to run inside the requested transaction.
