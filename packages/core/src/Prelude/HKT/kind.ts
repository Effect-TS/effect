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

export type Index<U extends ConcreteURIS, TC> = TC extends { [u in U]: infer X }
  ? X extends ConcreteURIS
    ? X
    : U
  : U

export type Kind<
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
  A,
  TC = {}
> = ((...x: F) => any) extends (fst: infer XURI, ...rest: infer Rest) => any
  ? XURI extends ConcreteURIS
    ? URItoKind<
        Auto,
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
        Rest extends URIS ? Kind<Rest, C, N, K, Q, W, X, I, S, R, E, A> : A
      >[Index<XURI, TC>]
    : XURI extends URI<infer U, infer FC>
    ? URItoKind<
        FC,
        C,
        OrFix<"N", FC, OrFix<"N", C, N>>,
        OrFix<"K", FC, OrFix<"K", C, K>>,
        OrFix<"Q", FC, OrFix<"Q", C, Q>>,
        OrFix<"W", FC, OrFix<"W", C, W>>,
        OrFix<"X", FC, OrFix<"X", C, X>>,
        OrFix<"I", FC, OrFix<"I", C, I>>,
        OrFix<"S", FC, OrFix<"S", C, S>>,
        OrFix<"R", FC, OrFix<"R", C, R>>,
        OrFix<"E", FC, OrFix<"E", C, E>>,
        Rest extends URIS ? Kind<Rest, C, N, K, Q, W, X, I, S, R, E, A> : A
      >[Index<U, TC>]
    : never
  : never

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
