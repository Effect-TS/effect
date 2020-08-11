import * as E from "../src/Either"
import { constant, flow, pipe } from "../src/Function"
import { StringSum, Sum } from "../src/Newtype"
import * as S from "../src/String"
import * as DSL from "../src/_abstract/DSL"

type Failure = Sum<string>

const Applicative = E.getValidationApplicative<Failure>(S.SumIdentity)
const validateS = DSL.sequenceSF(Applicative)()
const fail = E.makeValidationFail<Failure>()
const recover = E.makeValidationRecover<Failure>()
const succed = flow(constant, DSL.succeedF(Applicative))

pipe(
  validateS({
    a: fail(StringSum.wrap("(error A)")),
    b: fail(StringSum.wrap("(error B)")),
    c: fail(StringSum.wrap("(error C)")),
    d: succed("success")
  }),
  E.map(({ d }) => d),
  recover((e) => succed(`error: ${StringSum.unwrap(e)}`)),
  (x) => {
    console.log(x)
  }
)
