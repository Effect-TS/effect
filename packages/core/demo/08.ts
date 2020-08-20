import { makeAssociative } from "../src/Classic/Associative"
import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as DSL from "../src/Prelude/DSL"

const ValidationApplicative = T.getValidationApplicative(
  makeAssociative<string>((r) => (l) => `${l} | ${r}`)
)

const validationSequenceS = DSL.sequenceSF(ValidationApplicative)

const result = validationSequenceS({
  a: T.succeed(0),
  b: T.succeed(1),
  c: T.succeed(2),
  d: T.fail("d"),
  e: T.fail("e")
})

pipe(
  result,
  T.either,
  T.chain((e) =>
    T.effectTotal(() => {
      console.log(e)
    })
  ),
  T.runSync
)
