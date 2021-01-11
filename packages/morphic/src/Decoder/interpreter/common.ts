import * as A from "@effect-ts/core/Common/Array"
import { makeAssociative } from "@effect-ts/core/Common/Associative"
import * as NA from "@effect-ts/core/Common/NonEmptyArray"
import * as R from "@effect-ts/core/Common/Record"
import * as DSL from "@effect-ts/core/Prelude/DSL"
import * as T from "@effect-ts/core/Sync"

import type { Errors } from "../common"

export const AssociativeDecodeError = makeAssociative<Errors>((y) => (x) => [
  ...x,
  ...y
])

export const Validation = DSL.getValidationF({
  ...T.Applicative,
  ...T.Monad,
  ...T.Run,
  ...T.Fail
})(AssociativeDecodeError)

export const foreachNonEmptyArray = NA.foreachWithIndexF(Validation)
export const foreachArray = A.foreachWithIndexF(Validation)
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

export function originalSort(u: any, b: any) {
  const r = <any>{}
  const ks = new Set(Object.keys(b))

  for (const k of Object.keys(u)) {
    if (ks.has(k)) {
      ks.delete(k)
      r[k] = b[k]
    }
  }

  ks.forEach((k) => {
    r[k] = b[k]
  })

  return r
}

export function fixKey(s: string) {
  if (s.startsWith(".")) {
    return s.substr(1)
  }
  return s
}
