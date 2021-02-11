import type { Auto } from "./base"
import type { OrFix } from "./fix"
import type { ConcreteURIS, URItoIndex, URItoKind } from "./hkt"

export type URIS = ConcreteURIS | URI<ConcreteURIS, any>

export interface URI<F extends ConcreteURIS, C> {
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
> = F extends ConcreteURIS
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
      A
    >[F]
  : F extends URI<infer U, infer FC>
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
      A
    >[U]
  : never

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
