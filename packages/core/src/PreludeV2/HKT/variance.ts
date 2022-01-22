import type { UnionToIntersection } from "@effect-ts/system/Utils"

type OrNever<K> = unknown extends K ? never : K

type Variance = "+" | "-" | "_"

export type InitialVariance<V extends Variance> = {
  "+": never
  "-": unknown
  _: any
}[V]

// composes types according to variance specified in V
export type MixVariance<V extends Variance, X extends [any, ...any[]]> = V extends "_"
  ? X[0]
  : V extends "+"
  ? X[number]
  : V extends "-"
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

