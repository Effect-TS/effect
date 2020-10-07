import * as A from "@effect-ts/core/Classic/Array"
import { makeAssociative } from "@effect-ts/core/Classic/Associative"
import * as NA from "@effect-ts/core/Classic/NonEmptyArray"
import * as R from "@effect-ts/core/Classic/Record"
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

export const foreachNonEmptyArray = NA.foreachF(Validation)
export const foreachArray = A.foreachF(Validation)
export const foreachRecord = R.foreachF(Validation)
export const foreachRecordWithIndex = R.foreachWithIndexF(Validation)
export const tupled = DSL.tupledF(Validation)
export const struct = DSL.structF(Validation)
