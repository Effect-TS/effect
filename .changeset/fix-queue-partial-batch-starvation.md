---
"effect": patch
---

Keep `Queue.takeN` suspended when only part of its requested batch is available, preventing partial offers from starving the host. Consumers accessing `Queue.State.takers` directly must call each entry's `resume(...)` method instead of calling the entry as a function; entries also expose `ready()`.
