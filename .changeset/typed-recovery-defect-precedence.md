---
"effect": patch
---

Make defects take precedence over typed errors in every typed recovery operator.

When a failure cause contains both a typed error and a defect, typed recovery no longer runs and the defect is no longer dropped. The failure is propagated with every typed error converted to a defect, so `Fail(e) + Die(d)` becomes `Die(e) + Die(d)`. An interruption alongside a typed error does not prevent recovery.

This applies to `catch`, `catchTag`, `catchTags`, `catchIf`, `catchFilter`, `catchReason`, `catchReasons`, `orElseSucceed`, `ignore`, `result`, `orDie` and `retry` on `Effect`, `Stream` and `Channel`, and to `Effect.catchEager`, `matchEffect`, `match`, `matchEager`, `option`, `eventually` and `firstSuccessOf`. `Cause.findError` and `catchDefect` are unchanged.

The shared `Schedule` error path used by `Effect.retry`, `retryOrElse`, `repeat` and `repeatOrElse` follows the same rule:

- A cause with a defect is no longer re-raised unchanged. Its typed errors are converted to defects, and the `orElse` handler of `retryOrElse` / `repeatOrElse` does not run.
- A typed error alongside an interruption is now retried, and passed to `orElse`, instead of being re-raised unchanged. If retries run out, or `repeat` stops on the failure, only the typed error is re-raised, which is how causes with several typed errors are already handled.
