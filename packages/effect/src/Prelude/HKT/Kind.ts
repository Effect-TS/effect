import type { BaseURIS, URItoKind } from "./hkt"

export type URIS = [BaseURIS, ...BaseURIS[]]

type Union<B extends BaseURIS[]> = ((...y: B) => any) extends (...x: infer R) => any
  ? R
  : never

export type UnionURI<G extends BaseURIS, F extends BaseURIS[]> = F extends BaseURIS[]
  ? Union<[...F, G]>
  : F

export type InvertedUnionURI<
  G extends BaseURIS,
  F extends BaseURIS[]
> = F extends BaseURIS[] ? Union<[G, ...F]> : F

export type Kind<URI extends URIS, N extends string, K, SI, SO, X, I, S, R, E, A> = ((
  ...x: URI
) => any) extends (fst: infer XURI, ...rest: infer Rest) => any
  ? XURI extends BaseURIS
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
        Rest extends URIS ? Kind<Rest, N, K, SI, SO, X, I, S, R, E, A> : A
      >[XURI]
    : never
  : never
