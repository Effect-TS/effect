import { makeAssociative } from "../../src/Associative"
import * as E from "../../src/Either/index.js"
import * as DSL from "../../src/Prelude/DSL/index.js"
import * as X from "../../src/XPure/index.js"

test("07", () => {
  const A = E.struct({
    a: E.left(0),
    b: E.right(1),
    d: E.left("ok")
  })

  const ValidationApplicative = E.getValidationApplicative(
    makeAssociative<string>((l, r) => `${l} | ${r}`)
  )

  const structValidation = DSL.structF(ValidationApplicative)

  const result = structValidation({
    a: E.right(0),
    b: E.right(1),
    c: E.right(2),
    d: E.left("d"),
    e: E.left("e")
  })

  const C = X.struct({
    a: X.succeed(0),
    b: X.fail(0)
  })

  console.log(A)
  console.log(result)
  console.log(X.runEither(C))
})
