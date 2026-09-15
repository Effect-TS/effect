---
"effect": patch
---

Bound each Toolkit handler's result buffer to 16 entries so preliminary results backpressure slow consumers. Interrupt handlers when their result stream closes, including early termination and cancellation.
