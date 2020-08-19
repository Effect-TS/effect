import { makeAssociative } from "../src/Classic/Associative"
import * as E from "../src/Classic/Either"
import * as DSL from "../src/Prelude/DSL"

const A = E.sequenceS({
  a: E.left(0),
  b: E.right(1)
})

const ValidationApplicative = E.getValidationApplicative(
  makeAssociative<string>((r) => (l) => `${l} | ${r}`)
)

const validationSequenceS = DSL.sequenceSF(ValidationApplicative)()

const result = validationSequenceS({
  a: E.right(0),
  b: E.right(1),
  c: E.right(2),
  d: E.left("d"),
  e: E.left("e")
})

console.log(A)
console.log(result)
