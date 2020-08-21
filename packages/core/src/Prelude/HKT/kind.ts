import type { URISL0 as B, URISL0, URItoIndex, URItoKind } from "./hkt"
import type { Par } from "./variance"

export type BaseURIS = B | IndexedURI<B, Par, Par>

export type URIS = [BaseURIS, ...BaseURIS[]]

export interface IndexedURI<F extends B, P extends Par, Q extends Par> {
  _F: F
  _P: P
  _Q: Q
}

export type UnionURI<G extends BaseURIS, F extends BaseURIS[]> = F extends BaseURIS[]
  ? [...F, G]
  : F

export type InvertedUnionURI<
  G extends BaseURIS,
  F extends BaseURIS[]
> = F extends BaseURIS[] ? [G, ...F] : F

export type Alias<F extends URIS, P extends Par> = F[0] extends IndexedURI<
  infer U,
  P,
  infer Q
>
  ? Q
  : P

export type Indexed<F extends B, P extends Par, Q extends Par> = P extends Q
  ? F
  : IndexedURI<F, Q, P>

export type Kind<
  URI extends URIS,
  D,
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
> = ((...x: URI) => any) extends (fst: infer XURI, ...rest: infer Rest) => any
  ? XURI extends BaseURIS
    ? XURI extends B
      ? URItoKind<
          D,
          N,
          K,
          SI,
          SO,
          X,
          I,
          S,
          R,
          E,
          Rest extends URIS ? Kind<Rest, D, N, K, SI, SO, X, I, S, R, E, A> : A
        >[XURI]
      : XURI extends IndexedURI<infer F, infer P, infer Q>
      ? URItoKind<
          D,
          N,
          K,
          SI,
          SO,
          P extends "X"
            ? Q extends "I"
              ? I
              : Q extends "S"
              ? S
              : Q extends "R"
              ? R
              : Q extends "E"
              ? E
              : X
            : X,
          P extends "I"
            ? Q extends "X"
              ? X
              : Q extends "S"
              ? S
              : Q extends "R"
              ? R
              : Q extends "E"
              ? E
              : I
            : I,
          P extends "S"
            ? Q extends "X"
              ? X
              : Q extends "I"
              ? I
              : Q extends "R"
              ? R
              : Q extends "E"
              ? E
              : S
            : S,
          P extends "R"
            ? Q extends "X"
              ? X
              : Q extends "I"
              ? I
              : Q extends "S"
              ? S
              : Q extends "E"
              ? E
              : R
            : R,
          P extends "E"
            ? Q extends "X"
              ? X
              : Q extends "I"
              ? I
              : Q extends "S"
              ? S
              : Q extends "R"
              ? R
              : E
            : E,
          Rest extends URIS ? Kind<Rest, D, N, K, SI, SO, X, I, S, R, E, A> : A
        >[F]
      : never
    : never
  : never

export type IndexForBase<
  F extends URISL0,
  N extends string,
  K
> = F extends keyof URItoIndex<any, any> ? URItoIndex<N, K>[F] : K

export type IndexFor<URI extends URIS, N extends string, K> = IndexForBase<
  {
    [k in keyof URI]: URI[k] extends IndexedURI<infer F, infer P, infer Q>
      ? F
      : URI[k] extends URISL0
      ? URI[k]
      : never
  }[number],
  N,
  K
>
