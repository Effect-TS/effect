import * as A from "@effect-ts/core/Classic/Array"
import { makeAssociative } from "@effect-ts/core/Classic/Associative"
import * as NA from "@effect-ts/core/Classic/NonEmptyArray"
import * as R from "@effect-ts/core/Classic/Record"
import * as DSL from "@effect-ts/core/Prelude/DSL"
import * as T from "@effect-ts/core/Sync"

import { DecodeError } from "../common"

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
export const tuple = DSL.tupleF(Validation)
export const struct = DSL.structF(Validation)

export function mergePrefer(u: any, b: any, a: any) {
  const r = <any>{ ...b }

  for (const k of Object.keys(a)) {
    if (k in r && k in u) {
      if (u[k] !== a[k]) {
        r[k] = a[k]
      }
    } else {
      r[k] = a[k]
    }
  }

  return r
}
