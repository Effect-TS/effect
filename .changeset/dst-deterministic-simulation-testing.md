---
"effect": minor
"@effect/vitest": minor
---

feat: deterministic simulation testing (DST) framework

- Add `stepOne()` to `ControlledScheduler` for fine-grained task execution
- Add configurable clock source to `FiberId.unsafeMake()` for deterministic fiber identity
- Add `DSTScheduler` module with seeded PRNG scheduling, deterministic runtime, event logging, and liveness checking
- Add `it.dst()` test primitive to `@effect/vitest` for multi-seed property-based concurrency testing
