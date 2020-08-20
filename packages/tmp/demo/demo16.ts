import * as E from "../src/Either"
import { pipe } from "../src/Function"
import { StringSum } from "../src/Newtype"
import * as S from "../src/String"
import * as DSL from "../src/_abstract/DSL"

const validateS = DSL.sequenceSF(E.getValidationApplicative(S.SumIdentity))()

pipe(
  validateS({
    a: E.left(StringSum.wrap("(error A)")),
    b: E.left(StringSum.wrap("(error B)")),
    c: E.left(StringSum.wrap("(error C)")),
    d: E.right("success")
  }),
  (x) => {
    console.log(x)
  }
)
