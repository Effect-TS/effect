import { pipe } from "@effect-ts/system/Function"

import { makeAssociative } from "../src/Classic/Associative"
import * as E from "../src/Classic/Either"
import * as EitherT from "../src/Classic/EitherT"
import { getValidationF, sequenceSF } from "../src/Prelude/DSL"
import * as R from "../src/XPure/Reader"

/**
 * Silly example of Reader[_-, Either[_+, _+]] using transformers
 *
 * (all is already inglobated in XPure so a direct XPure interpretation would be much better)
 */

const Monad = pipe(R.Monad, EitherT.monad())
const Applicative = pipe(R.Applicative, EitherT.applicative())
const Run = pipe(R.Covariant, EitherT.run())
const Fail = pipe(R.Monad, EitherT.fail())

const getValidation = getValidationF({
  ...Monad,
  ...Applicative,
  ...Run,
  ...Fail
})

const StringValidation = getValidation(
  makeAssociative<string>((l) => (r) => `${l}, ${r}`)
)

const validate = sequenceSF(StringValidation)

export const result = validate({
  a: R.succeed(E.left("foo")),
  b: R.succeed(E.left("bar"))
})

test("14", () => {
  pipe(result, R.run, (x) => {
    console.log(x)
  })
})
