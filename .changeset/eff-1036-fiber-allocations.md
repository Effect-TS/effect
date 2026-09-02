---
"effect": patch
"@effect/opentelemetry": patch
---

Reduce allocations in Effect primitives and fibers.

Effect primitives, `Exit`, `Option`, `Result`, and `Deferred` values are now
constructed with exactly-sized constructors instead of `Object.create`, hot
combinators (`map`, `as`, `tap`, `andThen`) no longer allocate per-call
closures, and fibers share a per-context cache of derived values.

Breaking: the context-derived fields on the `Fiber` interface
(`currentScheduler`, `currentSpan`, `currentLogLevel`, `minimumLogLevel`,
`currentStackFrame`, `maxOpsBeforeYield`, `currentPreventYield`) moved to a
shared read-only `fiber.cache` object: use `fiber.cache.scheduler`,
`fiber.cache.span`, `fiber.cache.logLevel`, `fiber.cache.minimumLogLevel`,
`fiber.cache.stackFrame`, `fiber.cache.maxOpsBeforeYield`, and
`fiber.cache.preventYield` instead.
