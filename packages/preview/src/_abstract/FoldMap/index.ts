import { HasE, HasURI, HKTTL, KindTL, URIS } from "../HKT"
import { Identity } from "../Identity"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface FoldMapF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: HKTTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export interface FoldMapK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env, Err>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => M
}

export interface FoldMapKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly foldMap: <M>(
    I: Identity<M>
  ) => <A>(
    f: (a: A) => M
  ) => <K, NK extends string, SI, SO, X, In, S, Env>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, E, A>
  ) => M
}

export function makeFoldMap<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    FoldMapKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => FoldMapKE<URI, E, TL0, TL1, TL2, TL3>
export function makeFoldMap<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<FoldMapK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FoldMapK<URI, TL0, TL1, TL2, TL3>
export function makeFoldMap<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<FoldMapF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FoldMapF<URI, TL0, TL1, TL2, TL3>
export function makeFoldMap<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<FoldMapF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FoldMapF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    FoldMap: "FoldMap",
    ..._
  })
}
