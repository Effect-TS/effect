import type { OrFix } from "./fix"
import type { ConcreteURIS, URItoIndex, URItoKind } from "./hkt"

export type URIS = [RealURIS, ...RealURIS[]]

export interface URI<F extends ConcreteURIS, C> {
  _F: F
  _C: C
}

export type RealURIS = ConcreteURIS | URI<ConcreteURIS, any>

export type UnionURI<G extends RealURIS, F extends RealURIS[]> = F extends RealURIS[]
  ? [...F, G]
  : F

export type InvertedUnionURI<
  G extends RealURIS,
  F extends RealURIS[]
> = F extends RealURIS[] ? [G, ...F] : F

export type ConcreteKind<
  F extends URIS,
  C,
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
> = ((...x: F) => any) extends (fst: infer XURI, ...rest: infer Rest) => any
  ? XURI extends ConcreteURIS
    ? URItoKind<
        any,
        C,
        N,
        K,
        SI,
        SO,
        X,
        I,
        S,
        R,
        E,
        Rest extends URIS ? ConcreteKind<Rest, C, N, K, SI, SO, X, I, S, R, E, A> : A
      >[XURI]
    : XURI extends URI<infer U, infer FC>
    ? URItoKind<
        FC,
        C,
        N,
        K,
        SI,
        SO,
        OrFix<"X", FC, X>,
        OrFix<"I", FC, I>,
        OrFix<"S", FC, S>,
        OrFix<"R", FC, R>,
        OrFix<"E", FC, E>,
        Rest extends URIS ? ConcreteKind<Rest, C, N, K, SI, SO, X, I, S, R, E, A> : A
      >[U]
    : never
  : never

export type Kind<
  URI extends URIS,
  C,
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
> = ConcreteKind<
  URI,
  C,
  N,
  K,
  SI,
  SO,
  OrFix<"X", C, X>,
  OrFix<"I", C, I>,
  OrFix<"S", C, S>,
  OrFix<"R", C, R>,
  OrFix<"E", C, E>,
  A
>

export type IndexForBase<
  F extends ConcreteURIS,
  N extends string,
  K
> = F extends keyof URItoIndex<any, any> ? URItoIndex<N, K>[F] : K

export type IndexFor<F extends URIS, N extends string, K> = IndexForBase<
  {
    [K in keyof F]: F[K] extends ConcreteURIS
      ? F[K]
      : F[K] extends URI<infer U, any>
      ? U
      : never
  }[number],
  N,
  K
>
