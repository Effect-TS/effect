import * as E from "../src/Either"
import { constant, flow, pipe } from "../src/Function"
import * as S from "../src/String"
import * as DSL from "../src/_abstract/DSL"

const Applicative = E.getValidationApplicative(S.SumIdentity)
const validateS = DSL.sequenceSF(Applicative)()
const succed = flow(constant, DSL.succeedF(Applicative))

pipe(
  validateS({
    a: fail("(error A)"),
    b: fail("(error B)"),
    c: fail("(error C)"),
    d: succed("success")
  }),
  E.map(({ d }) => d),
  E.Recover.recover((e) => succed(`error: ${e}`)),
  (x) => {
    console.log(x)
  }
)
