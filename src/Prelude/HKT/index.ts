export interface F_<A> {
  URI: UF_
  A: A
}

export const UF_ = "F_"

export type UF_ = typeof UF_

export interface F__<E, A> {
  URI: UF__
  E: E
  A: A
}

export const UF__ = "F__"

export type UF__ = typeof UF__

export interface F___<R, E, A> {
  URI: UF___
  E: E
  A: A
  R: R
}

export const UF___ = "F___"

export type UF___ = typeof UF___

export interface F____<S, R, E, A> {
  URI: UF____
  E: E
  A: A
  R: R
  S: S
}

export const UF____ = "F____"

export type UF____ = typeof UF____

export const UG_ = "G_"

export type UG_ = typeof UG_

export interface G_<A> {
  URI: UG_
  A: A
}

export interface URItoKind<N extends string, K, SI, SO, X, I, S, R, E, A> {
  [UF_]: F_<A>
  [UG_]: G_<A>
  [UF__]: F__<E, A>
  [UF___]: F___<R, E, A>
  [UF____]: F____<S, R, E, A>
}

export interface URItoIndex<N extends string, K> {}

export type IndexFor<F extends URIS, N extends string, K> = F extends keyof URItoIndex<
  any,
  any
>
  ? URItoIndex<N, K>[F]
  : K

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

export type URIS = keyof URItoKind<any, any, any, any, any, any, any, any, any, any>

export type Kind<
  URI extends URIS,
  N extends string,
  K,
  SI,
  SO,
  X,
  I,
  S,
  R,
  E,
  A
> = URI extends URIS ? URItoKind<N, K, SI, SO, X, I, S, R, E, A>[URI] : never

export interface Auto {
  readonly Auto: unique symbol
}

export {
  FixE,
  FixI,
  FixK,
  FixN,
  FixR,
  FixS,
  FixX,
  OrE,
  OrI,
  OrK,
  OrN,
  OrR,
  OrS,
  OrX
} from "./fix"

export { instance } from "./instance"

export interface Base<F> {
  F: F
}

export interface CompositionBase2<F, G> {
  F: F
  G: G
}
