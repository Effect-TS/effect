import { makeAssociative } from "../src/Classic/Associative"
import * as E from "../src/Classic/Either"
import { constant } from "../src/Function"
import * as DSL from "../src/Prelude/DSL"
import * as X from "../src/Pure"

const A = E.sequenceS({
  a: E.left(0),
  b: E.right(1),
  d: E.left("ok")
})
export const B = E.invSequenceS({
  a: E.left(0),
  b: E.right(1)
  //c: E.left("1")
})

const ValidationApplicative = E.getValidationApplicative(
  makeAssociative<string>((r) => (l) => `${l} | ${r}`)
)

const validationSequenceS = DSL.sequenceSF(ValidationApplicative)

const result = validationSequenceS({
  a: E.right(0),
  b: E.right(1),
  c: E.right(2),
  d: E.left("d"),
  e: E.left("e")
})

const C = X.sequenceS({
  a: X.succeed(constant(0)),
  b: X.fail(0)
})

console.log(A)
console.log(result)
console.log(X.runEither(C))
