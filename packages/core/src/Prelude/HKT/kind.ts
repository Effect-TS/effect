import type { OrFix } from "./fix"
import type { ConcreteURIS, URItoIndex, URItoKind } from "./hkt"

export type URIS = [URI<ConcreteURIS, any>, ...URI<ConcreteURIS, any>[]]

export interface URI<F extends ConcreteURIS, C = {}> {
  _F: F
  _C: C
}

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
  A
> = F extends [any, ...infer Next]
  ? Next extends URIS
    ? URItoKind<
        F[0]["_C"],
        C,
        OrFix<"N", F[0]["_C"], OrFix<"N", C, N>>,
        OrFix<"K", F[0]["_C"], OrFix<"K", C, K>>,
        OrFix<"Q", F[0]["_C"], OrFix<"Q", C, Q>>,
        OrFix<"W", F[0]["_C"], OrFix<"W", C, W>>,
        OrFix<"X", F[0]["_C"], OrFix<"X", C, X>>,
        OrFix<"I", F[0]["_C"], OrFix<"I", C, I>>,
        OrFix<"S", F[0]["_C"], OrFix<"S", C, S>>,
        OrFix<"R", F[0]["_C"], OrFix<"R", C, R>>,
        OrFix<"E", F[0]["_C"], OrFix<"E", C, E>>,
        Kind<Next, C, N, K, Q, W, X, I, S, R, E, A>
      >[F[0]["_F"]]
    : URItoKind<
        F[0]["_C"],
        C,
        OrFix<"N", F[0]["_C"], OrFix<"N", C, N>>,
        OrFix<"K", F[0]["_C"], OrFix<"K", C, K>>,
        OrFix<"Q", F[0]["_C"], OrFix<"Q", C, Q>>,
        OrFix<"W", F[0]["_C"], OrFix<"W", C, W>>,
        OrFix<"X", F[0]["_C"], OrFix<"X", C, X>>,
        OrFix<"I", F[0]["_C"], OrFix<"I", C, I>>,
        OrFix<"S", F[0]["_C"], OrFix<"S", C, S>>,
        OrFix<"R", F[0]["_C"], OrFix<"R", C, R>>,
        OrFix<"E", F[0]["_C"], OrFix<"E", C, E>>,
        A
      >[F[0]["_F"]]
  : never

export type IndexForBase<
  F extends ConcreteURIS,
  N extends string,
  K
> = F extends keyof URItoIndex<any, any> ? URItoIndex<N, K>[F] : K

export type IndexFor<F extends URIS, N extends string, K> = IndexForBase<
  F[number] extends URI<infer U, any> ? U : never,
  N,
  K
>

export type Rest<F extends [any, ...any[]]> = F extends [any, ...infer Rest] ? Rest : []
