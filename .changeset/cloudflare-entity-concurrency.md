---
"@effect/platform-cloudflare": patch
---

Honor `Entity.toLayer` `concurrency` inside the entity Durable Object.
Storage entry (decode, persist-before-run, dedupe, duplicate resume, and
alarm arming) stays serialized, while handler execution now draws from a
per-entity semaphore sized by the option: default 1 serializes as before, a
number allows that many in-flight handlers, and `"unbounded"` removes the
limit. Replayed mailbox rows and alarm-due runs share the same budget, and a
handler's permit is released while a stream chunk waits for its client
acknowledgement. This also lets ask cycles between entities complete when the
called-back entity has `concurrency` of at least 2.
