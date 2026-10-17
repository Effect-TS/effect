---
"effect": patch
---

Give defects precedence when the runtime combines a typed failure with a defect, so typed-error recovery can no longer swallow a crashing finalizer or a dying concurrent sibling. When a finalizer (`ensuring`, `onExit`, `acquireRelease`, scope close), a concurrent `forEach`/`Effect.all`, or `raceAll` with every racer failing combines a typed failure with a defect, each typed failure now becomes a defect, keeping the original error first. `Effect.catch`, `catchTag`, `catchIf`, `match`, `result`, `option`, `ignore`, `mapError`, `Stream.catch`, and the other typed-error operators no longer see the typed error in that case, and `catchDefect` and `sandbox` receive it as a defect instead. Typed failures accompanied only by interruption, causes combined elsewhere (including with `Cause.combine`), and stream completion signals are unchanged.
