import { makeAssociative } from "../../src/Associative/index.js"
import * as E from "../../src/Either/index.js"
import * as DSL from "../../src/Prelude/DSL/index.js"

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
})
