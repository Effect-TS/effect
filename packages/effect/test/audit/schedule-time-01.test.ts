import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit, Schedule } from "effect"

// packages/effect/src/internal/schedule.ts:32 — repeatOrElse uses `catch_` (typed error only),
// so a `Done` merged with a finalizer defect is treated as clean completion.
// Contract: Pull.filterDone (src/Pull.ts:217) — a Done merged with a real failure (e.g. a
// failing finalizer) must surface the remaining cause rather than complete.
it.effect("repeat preserves finalizer defect accompanying schedule Done", () =>
  Effect.gen(function*() {
    const policy = Schedule.fromStep(
      Effect.succeed(() => Cause.done(42).pipe(Effect.ensuring(Effect.die("cleanup failed"))))
    )
    const exit = yield* Effect.exit(Effect.repeat(Effect.void, policy))
    assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause))
  }))
