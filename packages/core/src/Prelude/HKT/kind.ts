import type { OrFix } from "./fix"
import type { ConcreteURIS, URItoIndex, URItoKind } from "./hkt"

export type URIS = URI<ConcreteURIS, any, any>

export interface URI<
  F extends ConcreteURIS,
  C = {},
  N extends URI<any, any, any> | {} = {}
> {
  _F: F
  _C: C
  _N: N
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
> = URItoKind<
  F["_C"],
  C,
  OrFix<"N", F["_C"], OrFix<"N", C, N>>,
  OrFix<"K", F["_C"], OrFix<"K", C, K>>,
  OrFix<"Q", F["_C"], OrFix<"Q", C, Q>>,
  OrFix<"W", F["_C"], OrFix<"W", C, W>>,
  OrFix<"X", F["_C"], OrFix<"X", C, X>>,
  OrFix<"I", F["_C"], OrFix<"I", C, I>>,
  OrFix<"S", F["_C"], OrFix<"S", C, S>>,
  OrFix<"R", F["_C"], OrFix<"R", C, R>>,
  OrFix<"E", F["_C"], OrFix<"E", C, E>>,
  F["_N"] extends URI<any, any, any>
    ? Kind<F["_N"], C, N, K, Q, W, X, I, S, R, E, A>
    : A
>[F["_F"]]

export type IndexForBase<
  F extends ConcreteURIS,
  N extends string,
  K
> = F extends keyof URItoIndex<any, any> ? URItoIndex<N, K>[F] : K

export type IndexFor<F extends URIS, N extends string, K> = IndexForBase<
  F extends ConcreteURIS ? F : F extends URI<infer U, any> ? U : never,
  N,
  K
>
