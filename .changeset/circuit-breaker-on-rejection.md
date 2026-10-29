---
"effect": patch
---

Add `onRejection` to `CircuitBreaker.execute`. With `"allow"`, a call the circuit would refuse with `CircuitOpen` or `CircuitHalfOpen` runs unrecorded instead, while a call the circuit admits, probe included, is recorded as usual. Calls that must always run can then still count towards the breaker's state. Defaults to `"fail"`, which keeps the current behavior.
