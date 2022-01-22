// ets_tracing: off

import type { Either } from "@effect-ts/system/Either"

import type * as HKT from "../HKT/index.js"

export interface ChainRec<F extends HKT.HKT> extends HKT.Typeclass<F> {
  readonly chainRec: <A, B, R, E>(
    f: (a: A) => HKT.Kind<F, R, E, Either<A, B>>
  ) => (a: A) => HKT.Kind<F, R, E, B>
}

export function tailRec<A, B>(a: A, f: (a: A) => Either<A, B>): B {
  let v = f(a)
  while (v._tag === "Left") {
    v = f(v.left)
  }
  return v.right
}
