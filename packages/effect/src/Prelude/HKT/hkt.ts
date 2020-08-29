export const UF_ = "F_"
export type UF_ = typeof UF_
export interface F_<A> {
  URI: UF_
  A: A
}

export const UF__ = "F__"
export type UF__ = typeof UF__
export interface F__<E, A> {
  URI: UF__
  E: () => E
  A: A
}

export const UF___ = "F___"
export type UF___ = typeof UF___
export interface F___<R, E, A> {
  URI: UF___
  R: (_: R) => void
  E: () => E
  A: A
}

export const UF____ = "F____"
export type UF____ = typeof UF____
export interface F____<S, R, E, A> {
  URI: UF____
  S: S
  R: (_: R) => void
  E: () => E
  A: A
}

export const UG_ = "G_"
export type UG_ = typeof UG_
export interface G_<A> {
  URI: UG_
  A: A
}

export const UG__ = "G__"
export type UG__ = typeof UG__
export interface G__<E, A> {
  URI: UG__
  E: () => E
  A: A
}

export const UG___ = "G___"
export type UG___ = typeof UG___
export interface G___<R, E, A> {
  URI: UG___
  R: (_: R) => void
  E: () => E
  A: A
}

export const UG____ = "G____"
export type UG____ = typeof UG____
export interface G____<S, R, E, A> {
  URI: UG____
  S: S
  R: (_: R) => void
  E: () => E
  A: A
}

export const HKTFullURI = "HKTFullURI"
export type HKTFullURI = typeof HKTFullURI
export interface HKTFull<K, SI, SO, X, I, S, R, E, A> {
  URI: HKTFullURI
  K: () => K
  SI: (_: SI) => void
  SO: () => SO
  X: () => X
  I: (_: I) => void
  S: S
  R: (_: R) => void
  E: () => E
  A: A
}

export interface URItoKind<
  // encodes metadata carried at the URI level (like additional params)
  FC,
  // encodes constraints on parameters and variance at the typeclass level
  TC,
  // encodes nominal keys
  N extends string,
  // encodes generic keys
  K,
  // encodes free logic
  Q,
  // encodes free logic
  W,
  // encodes free logic (sync/async in FX)
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
  [UF_]: F_<A>
  [UF__]: F__<E, A>
  [UF___]: F___<R, E, A>
  [UF____]: F____<S, R, E, A>
  [UG_]: G_<A>
  [UG__]: G__<E, A>
  [UG___]: G___<R, E, A>
  [UG____]: G____<S, R, E, A>
}

export interface URItoIndex<N extends string, K> {}

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
  any,
  any
>
