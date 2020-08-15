import { HasE, HasURI, HKTTL, KindTL, URIS } from "../../HKT"

export interface RecoverF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly recover: <K2, KN2 extends string, X2, SO2, I2, R2, E2, A2, E, S, SI>(
    f: (e: E) => HKTTL<F, TL0, TL1, TL2, TL3, K2, KN2, SI, SO2, X2, I2, S, R2, E2, A2>
  ) => <K, KN extends string, X, SO, I, R, A>(
    fa: HKTTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => HKTTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K | K2,
    KN | KN2,
    SI,
    SO | SO2,
    X | X2,
    I & I2,
    S,
    R & R2,
    E2,
    A | A2
  >
}

export interface RecoverK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly recover: <K2, KN2 extends string, X2, SO2, I2, R2, E2, A2, E, S, SI>(
    f: (e: E) => KindTL<F, TL0, TL1, TL2, TL3, K2, KN2, SI, SO2, X2, I2, S, R2, E2, A2>
  ) => <K, KN extends string, X, SO, I, R, A>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => KindTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K | K2,
    KN | KN2,
    SI,
    SO | SO2,
    X | X2,
    I & I2,
    S,
    R & R2,
    E2,
    A | A2
  >
}

export interface RecoverKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly recover: <K2, KN2 extends string, X2, SO2, I2, R2, A2, S, SI>(
    f: (e: E) => KindTL<F, TL0, TL1, TL2, TL3, K2, KN2, SI, SO2, X2, I2, S, R2, E, A2>
  ) => <K, KN extends string, X, SO, I, R, A>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, KN, SI, SO, X, I, S, R, E, A>
  ) => KindTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    K | K2,
    KN | KN2,
    SI,
    SO | SO2,
    X | X2,
    I & I2,
    S,
    R & R2,
    E,
    A | A2
  >
}

export function makeRecover<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    RecoverKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => RecoverKE<URI, E, TL0, TL1, TL2, TL3>
export function makeRecover<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<RecoverK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => RecoverK<URI, TL0, TL1, TL2, TL3>
export function makeRecover<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<RecoverF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => RecoverF<URI, TL0, TL1, TL2, TL3>
export function makeRecover<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<RecoverF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => RecoverF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    Recover: "Recover",
    ..._
  })
}
