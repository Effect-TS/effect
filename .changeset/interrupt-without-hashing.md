---
"effect": patch
---

Fix interruption calling `Math.random` and hashing defects, which made deterministic hosts that forbid randomness loop forever or overflow the stack.
