import { assert, describe, it } from "@effect/vitest"
import { Arbitrary, Effect, Exit } from "effect"

describe("audit arbitrary-01", () => {
  // packages/effect/src/internal/arbitrary/runner.ts:508 recovers the whole Cause with Effect.matchEager.
  // Contract (packages/effect/src/Arbitrary.ts:645-656, checkEffect): "Defects and interruption continue through the
  // returned Effect instead of becoming `CheckResult` values" — this must hold when a typed failure accompanies them.
  it.effect("propagates a defect that accompanies a typed property failure", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(
        Arbitrary.checkEffect(
          Arbitrary.Constant(1),
          () => Effect.fail("property-error").pipe(Effect.ensuring(Effect.die("cleanup-defect"))),
          { runs: 1, seed: 0 }
        )
      )

      assert.isTrue(Exit.hasDies(exit))
    }))
})
