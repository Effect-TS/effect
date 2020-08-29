import type { Auto } from "./base"
import type { OrFix } from "./fix"
import type { ConcreteURIS, URItoIndex, URItoKind } from "./hkt"

export type URIS = [RealURIS, ...RealURIS[]]

export interface URI<F extends ConcreteURIS, C> {
  _F: F
  _C: C
}

export type RealURIS = ConcreteURIS | URI<ConcreteURIS, any>

export type AppendURI<F extends RealURIS[], G extends RealURIS> = F extends RealURIS[]
  ? [...F, G]
  : F

export type PrependURI<G extends RealURIS, F extends RealURIS[]> = F extends RealURIS[]
  ? [G, ...F]
  : F

export type ConcreteKind<
  F extends URIS,
  C,
  N extends string,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  A
> = ((...x: F) => any) extends (fst: infer XURI, ...rest: infer Rest) => any
  ? XURI extends ConcreteURIS
    ? URItoKind<
        Auto,
        C,
        N,
        K,
        Q,
        W,
        X,
        I,
        S,
        R,
        E,
        Rest extends URIS ? ConcreteKind<Rest, C, N, K, Q, W, X, I, S, R, E, A> : A
      >[XURI]
    : XURI extends URI<infer U, infer FC>
    ? URItoKind<
        FC,
        C,
        OrFix<"N", FC, N>,
        OrFix<"K", FC, K>,
        OrFix<"Q", FC, Q>,
        OrFix<"W", FC, W>,
        OrFix<"X", FC, X>,
        OrFix<"I", FC, I>,
        OrFix<"S", FC, S>,
        OrFix<"R", FC, R>,
        OrFix<"E", FC, E>,
        Rest extends URIS ? ConcreteKind<Rest, C, N, K, Q, W, X, I, S, R, E, A> : A
      >[U]
    : never
  : never

export type Kind<
  URI extends URIS,
  C,
  N extends string,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  A
> = ConcreteKind<
  URI,
  C,
  OrFix<"N", C, N>,
  OrFix<"K", C, K>,
  OrFix<"Q", C, Q>,
  OrFix<"W", C, W>,
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
