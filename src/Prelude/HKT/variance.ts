//
// Experiment
//

import { UnionToIntersection } from "../../Utils"

import { OrNever } from "./infer"

// list of parameters
export type Par = "I" | "R" | "E" | "X"

// covariant flags
export interface Cov<F extends Par> {
  Covariant: {
    F: () => F
  }
}

// contravariant flags
export interface Con<F extends Par> {
  Contravariant: {
    F: () => F
  }
}

// composes 2 types according to variance specified in C
export type Mix<C, P extends Par, X, Y> = C extends Cov<P>
  ? X | Y
  : C extends Con<P>
  ? X & Y
  : X

// composes 3 types according to variance specified in C
export type Mix2<C, P extends Par, X, Y, Z> = C extends Cov<P>
  ? X | Y | Z
  : C extends Con<P>
  ? X & Y & Z
  : X

// composes 4 types according to variance specified in C
export type Mix3<C, P extends Par, X, Y, Z, K> = C extends Cov<P>
  ? X | Y | Z | K
  : C extends Con<P>
  ? X & Y & Z & K
  : X

// composes an array of types to the base respecting variance from C
export type MixAll<C, P extends Par, X, Y extends any[]> = C extends Cov<P>
  ? Y[number]
  : C extends Con<P>
  ? UnionToIntersection<{ [k in keyof Y]: OrNever<Y[k]> }[number]>
  : X

// composes a record of types to the base respecting variance from C
export type MixAllS<C, P extends Par, X, Y> = C extends Cov<P>
  ? Y[keyof Y]
  : C extends Con<P>
  ? UnionToIntersection<{ [k in keyof Y]: OrNever<Y[k]> }[keyof Y]>
  : X

// used in subsequent definitions to either vary a paramter or keep it fixed to "First"
export type Def<C, P extends Par, First, Current> = C extends Cov<P>
  ? Current
  : C extends Con<P>
  ? Current
  : First
