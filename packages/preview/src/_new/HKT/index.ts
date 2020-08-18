import { Generic, genericDef } from "../../Newtype"

export interface HKT<K, SI, SO, X, I, S, R, E, A> {
  K: K
  SI: SI
  SO: SO
  X: X
  I: I
  S: S
  R: R
  E: E
  A: A
}

export const HKTURI = "HKTURI"
export type HKTURI = typeof HKTURI

export interface URItoKind<K, SI, SO, X, I, S, R, E, A> {
  [HKTURI]: HKT<K, SI, SO, X, I, S, R, E, A>
}

export type URIS = keyof URItoKind<any, any, any, any, any, any, any, any, any>

export type Kind<URI extends URIS, K, SI, SO, X, I, S, R, E, A> = URI extends URIS
  ? URItoKind<K, SI, SO, X, I, S, R, E, A>[URI]
  : never

export interface Auto {
  readonly Auto: unique symbol
}

export type Or<A, B> = A extends Fix<infer X> ? X : B

export const Fix = genericDef("@newtype/Fix")

export interface Fix<F> extends Generic<F, typeof Fix> {}
