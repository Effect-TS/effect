//
// Generic F
//

export interface F_<A> {
  URI: UF_
  A: A
}

export const UF_ = "HKTFURI"
export type UF_ = typeof UF_

//
// Generic F[_, _]
//
export interface F__<E, A> {
  URI: UF__
  E: E
  A: A
}

export const UF__ = "HKT2URI"
export type UF__ = typeof UF__

//
// Generic G
//

export const UG_ = "HKTGURI"
export type UG_ = typeof UG_

export interface G_<A> {
  URI: UG_
  A: A
}

export interface URItoKind<K, SI, SO, X, I, S, R, E, A> {
  [UF_]: F_<A>
  [UG_]: G_<A>
  [UF__]: F__<E, A>
}

//
// Generic HKT with All the types
//

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

//
// Lookups
//

export type URIS = keyof URItoKind<any, any, any, any, any, any, any, any, any>

export type Kind<URI extends URIS, K, SI, SO, X, I, S, R, E, A> = URI extends URIS
  ? URItoKind<K, SI, SO, X, I, S, R, E, A>[URI]
  : never

export interface Auto {
  readonly Auto: unique symbol
}

export { FixE, FixI, FixK, FixR, FixS, FixX, OrE, OrI, OrK, OrR, OrS, OrX } from "./fix"

export interface Base<F> {
  F: F
}

export interface CompositionBase2<F, G> {
  F: F
  G: G
}

export { instance } from "./instance"
