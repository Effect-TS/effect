---
"effect": minor
---

Add `CircuitBreaker` to `effect/persistence`, with consecutive-failure and failure-rate policies, schedule-based `openFor`, half-open probes, `classify` for typed errors, `onRejected: "wait"` for background workers, telemetry, and in-memory and Redis stores. Add `HttpClient.withCircuitBreaker` and `HttpClient.classifyTransient`.
