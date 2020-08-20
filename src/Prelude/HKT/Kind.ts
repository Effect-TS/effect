import type { BaseURIS, URItoKind } from "./hkt"

export type URIS = [BaseURIS, BaseURIS?, BaseURIS?, BaseURIS?, BaseURIS?]
export type RestrictedKindURI = [BaseURIS, BaseURIS?, BaseURIS?, BaseURIS?]

export type UnionURI<G extends BaseURIS, F extends RestrictedKindURI> = F extends [
  BaseURIS,
  BaseURIS,
  BaseURIS,
  BaseURIS
]
  ? [F[0], F[1], F[2], F[3], G]
  : F extends [BaseURIS, BaseURIS, BaseURIS]
  ? [F[0], F[1], F[2], G]
  : F extends [BaseURIS, BaseURIS]
  ? [F[0], F[1], G]
  : F extends [BaseURIS]
  ? [F[0], G]
  : F

export type InvertedUnionURI<
  G extends BaseURIS,
  F extends RestrictedKindURI
> = F extends [BaseURIS, BaseURIS, BaseURIS, BaseURIS]
  ? [G, F[0], F[1], F[2], F[3]]
  : F extends [BaseURIS, BaseURIS, BaseURIS]
  ? [G, F[0], F[1], F[2]]
  : F extends [BaseURIS, BaseURIS]
  ? [G, F[0], F[1]]
  : F extends [BaseURIS]
  ? [G, F[0]]
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
> = URI extends [BaseURIS, BaseURIS, BaseURIS, BaseURIS, BaseURIS]
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
            URItoKind<N, K, SI, SO, X, I, S, R, E, A>[URI[4]]
          >[URI[3]]
        >[URI[2]]
      >[URI[1]]
    >[URI[0]]
  : URI extends [BaseURIS, BaseURIS, BaseURIS, BaseURIS]
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
          URItoKind<N, K, SI, SO, X, I, S, R, E, A>[URI[3]]
        >[URI[2]]
      >[URI[1]]
    >[URI[0]]
  : URI extends [BaseURIS, BaseURIS, BaseURIS]
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
