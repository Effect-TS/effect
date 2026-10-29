---
"effect": minor
---

Pass `{ probe }` to `CircuitBreaker` `classify` callbacks, including `HttpClient.withCircuitBreaker`. `probe` is `true` when the call is the HalfOpen probe, so a classifier can count an outcome it otherwise ignores, such as a rate-limited response, as a failure that reopens the circuit. Existing one-argument classifiers are unchanged. The callback type is exported as `CircuitBreaker.Classifier`.
