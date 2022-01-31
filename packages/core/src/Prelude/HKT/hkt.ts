// ets_tracing: off

import type { AccessCustom, CustomType } from "./custom.js"
import type { URI } from "./kind.js"

export interface HKT<F, A> {
  F: F
  A: A
}

export interface HKT2<F, E, A> {
  F: F
  E: E
  A: A
}

export interface HKT3<F, R, E, A> {
  F: F
  R: R
  E: E
  A: A
}

export interface HKT4<F, S, R, E, A> {
  F: F
  S: S
  R: R
  E: E
  A: A
}

export type UHKT<F> = [URI<"HKT1", CustomType<"F", F>>]
export type UHKT2<F> = [URI<"HKT2", CustomType<"F", F>>]
export type UHKT3<F> = [URI<"HKT3", CustomType<"F", F>>]
export type UHKT4<F> = [URI<"HKT4", CustomType<"F", F>>]

export type UHKTCategory<F> = [URI<"HKTCategory", CustomType<"F", F>>]

export interface URItoKind<
  // encodes metadata carried at the URI level (like additional params)
  FC,
  // encodes constraints on parameters and variance at the typeclass level
  TC,
  // encodes generic keys
  K,
  // encodes free logic
  Q,
  // encodes free logic
  W,
  // encodes free logic
  X,
  // encodes free logic (input in FX)
  I,
  // encodes free logic (state in FX)
  S,
  // encodes free logic (environment in FX)
  R,
  // encodes free logic (error in FX)
  E,
  // encodes output
  A
> {
  ["HKT1"]: HKT<AccessCustom<FC, "F">, A>
  ["HKT2"]: HKT2<AccessCustom<FC, "F">, E, A>
  ["HKTCategory"]: HKT2<AccessCustom<FC, "F">, I, A>
  ["HKT3"]: HKT3<AccessCustom<FC, "F">, R, E, A>
  ["HKT4"]: HKT4<AccessCustom<FC, "F">, S, R, E, A>
}

export interface URItoIndex<K> {}

export type ConcreteURIS = keyof URItoKind<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
