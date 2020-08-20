import type { BaseURIS, URItoKind } from "./hkt"

export type URIS = [BaseURIS, BaseURIS?, BaseURIS?]
export type RestrictedKindURI = [BaseURIS, BaseURIS?]

export type UnionURI<G extends BaseURIS, F extends RestrictedKindURI> = F extends [
  BaseURIS,
  BaseURIS
]
  ? [F[0], F[1], G]
  : F extends [BaseURIS]
  ? [F[0], G]
  : F

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
> = URI extends [BaseURIS, BaseURIS, BaseURIS]
  ? URItoKind<
      N,
      K,
      SI,
      SO,
      X,
      I,
      S,
      R,
      E,
      URItoKind<
        N,
        K,
        SI,
        SO,
        X,
        I,
        S,
        R,
        E,
        URItoKind<N, K, SI, SO, X, I, S, R, E, A>[URI[2]]
      >[URI[1]]
    >[URI[0]]
  : URI extends [BaseURIS, BaseURIS]
  ? URItoKind<
      N,
      K,
      SI,
      SO,
      X,
      I,
      S,
      R,
      E,
      URItoKind<N, K, SI, SO, X, I, S, R, E, A>[URI[1]]
    >[URI[0]]
  : URI extends [BaseURIS]
  ? URItoKind<N, K, SI, SO, X, I, S, R, E, A>[URI[0]]
  : never
