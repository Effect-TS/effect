import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as it from "effect/test/utils/extend"
import { assert, describe } from "vitest"

describe("Effect", () => {
  it.effect("liftPredicate", () => {
    const isPositivePredicate = (n: number) => n > 0
    const onPositivePredicateError = (n: number) => `${n} is not positive`
    const isNumberRefinement = (n: string | number): n is number => typeof n === "number"
    const onNumberRefinementError = (n: string | number) => `${n} is not a number`

    return Effect.gen(function*() {
      assert.deepStrictEqual(
        yield* pipe(1, Effect.liftPredicate(isPositivePredicate, onPositivePredicateError)),
        1
      )
      assert.deepStrictEqual(
        yield* pipe(-1, Effect.liftPredicate(isPositivePredicate, onPositivePredicateError), Effect.flip),
        `-1 is not positive`
      )
      assert.deepStrictEqual(
        yield* pipe(1, Effect.liftPredicate(isNumberRefinement, onNumberRefinementError)),
        1
      )
      assert.deepStrictEqual(
        yield* pipe("string", Effect.liftPredicate(isNumberRefinement, onNumberRefinementError), Effect.flip),
        `string is not a number`
      )
      assert.deepStrictEqual(
        yield* Effect.liftPredicate(1, isPositivePredicate, onPositivePredicateError),
        1
      )
      assert.deepStrictEqual(
        yield* Effect.liftPredicate(-1, isPositivePredicate, onPositivePredicateError).pipe(Effect.flip),
        `-1 is not positive`
      )
      assert.deepStrictEqual(
        yield* Effect.liftPredicate(1, isNumberRefinement, onNumberRefinementError),
        1
      )
      assert.deepStrictEqual(
        yield* Effect.liftPredicate("string", isNumberRefinement, onNumberRefinementError).pipe(Effect.flip),
        `string is not a number`
      )
    })
  })
})
