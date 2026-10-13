// Helpers for testing assertions with assertions: a failure that is expected is
// returned (and taken off the test's record), anything else fails the test.
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import * as Assert from "../src/Assert.ts"
import { AssertionError } from "../src/AssertionError.ts"
import { current } from "../src/AssertionRecord.ts"

/** The `AssertionError` a function throws. */
export const fails = (thunk: () => unknown): AssertionError => Assert.instanceOf(Assert.throws(thunk), AssertionError)

/** The `AssertionError` an Effect dies with (an Effect assertion failed). */
export const failsEffect = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<AssertionError, E, R> =>
  Effect.gen(function*() {
    const record = current()
    const exit = yield* Effect.exit(effect)
    const error = Assert.instanceOf(Assert.defect(exit as Exit.Exit<A, never>), AssertionError)
    record?.failures.delete(error)
    return error
  })

/** The mismatches of a failure as `path: reason` lines, for compact expectations. */
export const lines = (error: AssertionError): Array<string> => error.message.split("\n").slice(1).map((l) => l.trim())
