// ets_tracing: off

import type { OrFix } from "./fix.js"
import type { ConcreteURIS, URItoIndex, URItoKind } from "./hkt.js"

export type URIS = [URI<ConcreteURIS, any>, ...URI<ConcreteURIS, any>[]]

export interface URI<F extends ConcreteURIS, C = {}> {
  _F: F
  _C: C
}

export type Kind<F extends URIS, C, K, Q, W, X, I, S, R, E, A> = KindRec<
  F,
  C,
  K,
  Q,
  W,
  X,
  I,
  S,
  R,
  E,
  A
>

type KindRec<F, C, K, Q, W, X, I, S, R, E, A> = F extends [any, ...infer Next]
  ? URItoKind<
      F[0]["_C"],
      C,
      OrFix<"K", F[0]["_C"], OrFix<"K", C, K>>,
      OrFix<"Q", F[0]["_C"], OrFix<"Q", C, Q>>,
      OrFix<"W", F[0]["_C"], OrFix<"W", C, W>>,
      OrFix<"X", F[0]["_C"], OrFix<"X", C, X>>,
      OrFix<"I", F[0]["_C"], OrFix<"I", C, I>>,
      OrFix<"S", F[0]["_C"], OrFix<"S", C, S>>,
      OrFix<"R", F[0]["_C"], OrFix<"R", C, R>>,
      OrFix<"E", F[0]["_C"], OrFix<"E", C, E>>,
      KindRec<Next, C, K, Q, W, X, I, S, R, E, A>
    >[F[0]["_F"]]
  : A

export type IndexForBase<F extends ConcreteURIS, K> = F extends keyof URItoIndex<any>
  ? URItoIndex<K>[F]
  : K

export type IndexFor<F extends URIS, K> = IndexForBase<
  F[number] extends URI<infer U, any> ? U : never,
  K
>

export type Rest<F extends [any, ...any[]]> = F extends [any, ...infer Rest] ? Rest : []
