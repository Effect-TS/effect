// ets_tracing: off

import type { UnionToIntersection } from "../../Utils/index.js"
import type { Param } from "./fix.js"
import type { OrNever } from "./or-never.js"

export type Variance = "+" | "-" | "_"

export interface V<F extends Param, V extends Variance> {
  Variance: {
    [v in V]: () => F
  }
}

// composes types according to variance specified in C
export type Mix<C, P extends Param, X extends [any, ...any[]]> = C extends V<P, "_">
  ? X[0]
  : C extends V<P, "+">
  ? X[number]
  : C extends V<P, "-">
  ? X extends [any]
    ? X[0]
    : X extends [any, any]
    ? X[0] & X[1]
    : X extends [any, any, any]
    ? X[0] & X[1] & X[2]
    : X extends [any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3]
    : X extends [any, any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3] & X[4]
    : X extends [any, any, any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3] & X[4] & X[5]
    : UnionToIntersection<{ [k in keyof X]: OrNever<X[k]> }[keyof X]>
  : X[0]

// composes a record of types to the base respecting variance from C
export type MixStruct<C, P extends Param, X, Y> = C extends V<P, "_">
  ? X
  : C extends V<P, "+">
  ? Y[keyof Y]
  : C extends V<P, "-">
  ? UnionToIntersection<{ [k in keyof Y]: OrNever<Y[k]> }[keyof Y]>
  : X

// used in subsequent definitions to either vary a paramter or keep it fixed to "Fixed"
export type Intro<C, P extends Param, Fixed, Current> = C extends V<P, "_">
  ? Fixed
  : C extends V<P, "+">
  ? Current
  : C extends V<P, "-">
  ? Current
  : Fixed

// initial type depending on variance of P in C (eg: initial Contravariant R = unknown, initial Covariant E = never)
export type Initial<C, P extends Param> = C extends V<P, "-">
  ? unknown
  : C extends V<P, "+">
  ? never
  : any
