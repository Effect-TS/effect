import { makeAssociative } from "../../src/Associative/index.js"
import * as E from "../../src/Either/index.js"
import { pipe } from "../../src/Function"
import * as DSL from "../../src/PreludeV2/DSL/index.js"
import * as X from "../../src/XPure/index.js"

test("07", async () => {
  const A: E.Either<string | number, { a: never; b: number; d: never }> = E.struct({
    a: E.left(0),
    b: E.right(1),
    d: E.left("ok")
  })
  expect(A).toEqual(E.left("ok"))

  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((l, r) => `${l} | ${r}`)
  )

  const structValidation = DSL.structF(ValidationApplicative)

  const B: E.Either<string, { a: number; b: number; c: number; d: never; e: never }> =
    structValidation({
      a: E.right(0),
      b: E.right(1),
      c: E.right(2),
      d: E.left("d"),
      e: E.left("e")
    })
  expect(B).toEqual(E.left("e | d"))

  const C: X.XPure<never, unknown, unknown, unknown, number, { a: number; b: never }> =
    X.struct()({
      a: X.succeed(0),
      b: X.fail(0)
    })

  expect(await pipe(C, X.runEither)).toEqual(E.left(0))
})
