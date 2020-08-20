//
// Experiment
//

import { UnionToIntersection } from "../../Utils"

import { OrNever } from "./infer"

import { NonEmptyArray } from "@effect-ts/system/NonEmptyArray"

// list of parameters
type Par = "I" | "R" | "S" | "E" | "X"

// covariant flags
export interface CovariantP<F extends Par> {
  Covariant: {
    F: () => F
  }
}

// contravariant flags
export interface ContravariantP<F extends Par> {
  Contravariant: {
    F: () => F
  }
}

// invariant flags
export interface InvariantP<F extends Par> {
  Invariant: {
    F: () => F
  }
}

// composes types according to variance specified in C
export type Mix<C, P extends Par, X extends NonEmptyArray<any>> = C extends InvariantP<
  P
>
  ? X[0]
  : C extends CovariantP<P>
  ? X[number]
  : C extends ContravariantP<P>
  ? X extends [any, any]
    ? X[0] & X[1]
    : X extends [any, any, any]
    ? X[0] & X[1] & X[2]
    : X extends [any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3]
    : X extends [any, any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3] & X[3]
    : X extends [any, any, any, any, any, any]
    ? X[0] & X[1] & X[2] & X[3] & X[3] & X[4]
    : UnionToIntersection<{ [k in keyof X]: OrNever<X[k]> }[keyof X]>
  : X[0]

// composes a record of types to the base respecting variance from C
export type MixStruct<C, P extends Par, X, Y> = C extends InvariantP<P>
  ? X
  : C extends CovariantP<P>
  ? Y[keyof Y]
  : C extends ContravariantP<P>
  ? UnionToIntersection<{ [k in keyof Y]: OrNever<Y[k]> }[keyof Y]>
  : X

// used in subsequent definitions to either vary a paramter or keep it fixed to "Fixed"
export type Intro<C, P extends Par, Fixed, Current> = C extends InvariantP<P>
  ? Fixed
  : C extends CovariantP<P>
  ? Current
  : C extends ContravariantP<P>
  ? Current
  : Fixed

// initial type depending on variance of P in C (eg: initial Contravariant R = unknown, initial Covariant E = never)
export type Initial<C, P extends Par> = C extends ContravariantP<P>
  ? unknown
  : C extends CovariantP<P>
  ? never
  : any
