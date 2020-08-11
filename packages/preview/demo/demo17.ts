import * as E from "../src/Either"
import { constant, flow, pipe } from "../src/Function"
import { StringSum, Sum } from "../src/Newtype"
import * as S from "../src/String"
import * as DSL from "../src/_abstract/DSL"

type Failure = Sum<string>

const Applicative = E.getValidationApplicative<Failure>(S.SumIdentity)
const validateS = DSL.sequenceSF(Applicative)()
const recover = E.makeValidationRecover<Failure>()
const succed = flow(constant, DSL.succeedF(Applicative))
const failure = StringSum.wrap
const fail = flow(failure, E.makeValidationFail<Failure>())

pipe(
  validateS({
    a: fail("(error A)"),
    b: fail("(error B)"),
    c: fail("(error C)"),
    d: succed("success")
  }),
  E.map(({ d }) => d),
  recover((e) => succed(`error: ${e}`)),
  (x) => {
    console.log(x)
  }
)
