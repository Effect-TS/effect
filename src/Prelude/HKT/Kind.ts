import type { BaseURIS as B, URItoKind } from "./hkt"
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
              : R
            : R,
          P extends "I"
            ? Q extends "X"
              ? X
              : Q extends "S"
              ? S
              : Q extends "R"
              ? R
              : Q extends "E"
              ? E
              : R
            : R,
          P extends "S"
            ? Q extends "X"
              ? X
              : Q extends "I"
              ? I
              : Q extends "R"
              ? R
              : Q extends "E"
              ? E
              : R
            : R,
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
          E,
          Rest extends URIS ? Kind<Rest, D, N, K, SI, SO, X, I, S, R, E, A> : A
        >[F]
      : never
    : never
  : never
