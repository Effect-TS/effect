import { HasE, HasURI, HKTTL, KindTL, URIS } from "../HKT"

/**
 * An associative binary operator that combines two values of types `F[A]`
 * and `F[B]` to produce an `F[(A, B)]`.
 */
export interface AssociativeBothF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, Err2, B>(
    fb: HKTTL<F, TL0, TL1, TL2, TL3, K2, NK2, SO, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, X, In, Env, Err, A>(
    fa: HKTTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => HKTTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K | K2,
    NK2 | NK,
    SI,
    SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    Err2 | Err,
    readonly [A, B]
  >
}

export interface AssociativeBothK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, Err2, B>(
    fb: KindTL<F, TL0, TL1, TL2, TL3, K2, NK2, SO, SO2, X2, In2, S, Env2, Err2, B>
  ) => <K, NK extends string, SI, X, In, Env, Err, A>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, Err, A>
  ) => KindTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K | K2,
    NK2 | NK,
    SI,
    SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    Err2 | Err,
    readonly [A, B]
  >
}

export interface AssociativeBothKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly both: <K2, NK2 extends string, SO, SO2, X2, In2, S, Env2, B>(
    fb: KindTL<F, TL0, TL1, TL2, TL3, K2, NK2, SO, SO2, X2, In2, S, Env2, E, B>
  ) => <K, NK extends string, SI, X, In, Env, A>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, S, Env, E, A>
  ) => KindTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K | K2,
    NK2 | NK,
    SI,
    SO2,
    X2 | X,
    In2 & In,
    S,
    Env2 & Env,
    E,
    readonly [A, B]
  >
}

export function makeAssociativeBoth<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    AssociativeBothKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => AssociativeBothKE<URI, E, TL0, TL1, TL2, TL3>
export function makeAssociativeBoth<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    AssociativeBothK<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => AssociativeBothK<URI, TL0, TL1, TL2, TL3>
export function makeAssociativeBoth<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    AssociativeBothF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => AssociativeBothF<URI, TL0, TL1, TL2, TL3>
export function makeAssociativeBoth<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    AssociativeBothF<URI, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3"
  >
) => AssociativeBothF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
