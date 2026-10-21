import { assert } from "@effect/vitest"
import { Effect } from "effect"

/** Asserts the effect fails with the given tagged error. */
export const expectTag = <A, E extends { readonly _tag: string }, R>(
  effect: Effect.Effect<A, E, R>,
  tag: E["_tag"]
) =>
  Effect.exit(effect).pipe(
    Effect.map((exit) => {
      assert.strictEqual(exit._tag, "Failure")
      if (exit._tag === "Failure") {
        const tags = exit.cause.reasons.map((reason) => reason._tag === "Fail" ? reason.error._tag : reason._tag)

        assert.include(tags, tag)
      }
    })
  )
