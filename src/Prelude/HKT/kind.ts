import type {
  AccessType,
  SetType,
  URISL0 as B,
  URISL0,
  URItoIndex,
  URItoKind
} from "./hkt"
import type { Mix, Par } from "./variance"

export type BaseURIS = B | IndexedURI<B, [[Par, Par], ...[Par, Par][]]>

export type URIS = [BaseURIS, ...BaseURIS[]]

export interface IndexedURI<F extends B, FT extends [[Par, Par], ...[Par, Par][]]> {
  _F: F
  _FT: FT
}

export type UnionURI<G extends BaseURIS, F extends BaseURIS[]> = F extends BaseURIS[]
  ? [...F, G]
  : F

export type InvertedUnionURI<
  G extends BaseURIS,
  F extends BaseURIS[]
> = F extends BaseURIS[] ? [G, ...F] : F

export type AliasFT<FT extends [[Par, Par], ...[Par, Par][]], P extends Par> = ((
  ...x: FT
) => any) extends (fst: [infer P_, infer Q_], ...r: infer Rest) => any
  ? P extends P_
    ? Q_
    : Rest extends [[Par, Par], ...[Par, Par][]]
    ? AliasFT<Rest, P>
    : P
  : P

export type Alias<F extends URIS, P extends Par> = ((...x: F) => any) extends (
  fst: infer X,
  ...rest: infer Rest
) => any
  ? X extends IndexedURI<any, infer FT>
    ? AliasFT<FT, P>
    : Rest extends URIS
    ? Alias<Rest, P>
    : P
  : P

export type Indexed<F extends B, FT extends IndexBase> = Cleanup<FT> extends infer X
  ? X extends [[Par, Par], ...[Par, Par][]]
    ? IndexedURI<F, X>
    : F
  : F

export type IndexBase = [[Par, Par], [Par, Par]?, [Par, Par]?, [Par, Par]?, [Par, Par]?]

export type Cleanup<FT extends IndexBase> = ((...x: FT) => any) extends (
  fst: [infer P_, infer Q_],
  ...r: infer Rest
) => any
  ? P_ extends Q_
    ? Rest extends IndexBase
      ? Cleanup<Rest>
      : []
    : Rest extends IndexBase
    ? [[P_, Q_], ...Cleanup<Rest>]
    : [[P_, Q_]]
  : []

export type Reindex<
  Cur extends Par,
  FT extends [[Par, Par], ...[Par, Par][]],
  X,
  I,
  S,
  R,
  E
> = ((...x: FT) => any) extends (a: [infer P, infer Q], ...r: infer Rest) => any
  ? Cur extends P
    ? Q extends "X"
      ? X
      : Q extends "I"
      ? I
      : Q extends "S"
      ? S
      : Q extends "R"
      ? R
      : Q extends "E"
      ? E
      : never
    : Rest extends [[Par, Par], ...[Par, Par][]]
    ? Reindex<Cur, Rest, X, I, S, R, E>
    : Cur extends "X"
    ? X
    : Cur extends "I"
    ? I
    : Cur extends "S"
    ? S
    : Cur extends "R"
    ? R
    : Cur extends "E"
    ? E
    : never
  : never

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
      : XURI extends IndexedURI<infer F, infer FT>
      ? URItoKind<
          D,
          N,
          K,
          SI,
          SO,
          Reindex<"X", FT, X, I, S, R, E>,
          Reindex<"I", FT, X, I, S, R, E>,
          Reindex<"S", FT, X, I, S, R, E>,
          Reindex<"R", FT, X, I, S, R, E>,
          Reindex<"E", FT, X, I, S, R, E>,
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
    [k in keyof URI]: URI[k] extends IndexedURI<infer F, infer FT>
      ? F
      : URI[k] extends URISL0
      ? URI[k]
      : never
  }[number],
  N,
  K
>

export type MixTypes<
  F extends URIS,
  C,
  Cur extends Par,
  Tar extends Par,
  X,
  I,
  S,
  R,
  E,
  X2,
  I2,
  S2,
  R2,
  E2
> = SetType<
  F,
  C,
  Cur,
  X,
  Tar,
  Mix<
    C,
    Alias<F, Tar>,
    [AccessType<F, C, Tar, X, I, S, R, E>, AccessType<F, C, Tar, X2, I2, S2, R2, E2>]
  >
>
