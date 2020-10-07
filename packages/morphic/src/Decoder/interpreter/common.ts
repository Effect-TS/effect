import { makeAssociative } from "@effect-ts/core/Classic/Associative"
import * as T from "@effect-ts/core/Classic/Sync"
import * as DSL from "@effect-ts/core/Prelude/DSL"

import { DecodeError } from "../hkt"

export const AssociativeDecodeError = makeAssociative<DecodeError>((y) => (x) =>
  new DecodeError([...x.errors, ...y.errors])
)

export const Validation = DSL.getValidationF({
  ...T.Applicative,
  ...T.Monad,
  ...T.Run,
  ...T.Fail
})(AssociativeDecodeError)
