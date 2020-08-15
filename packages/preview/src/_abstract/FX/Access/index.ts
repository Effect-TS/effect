import { HasE, HasURI, HKTTL, KindTL, URIS } from "../../HKT"

export interface AccessF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => HKTTL<F, TL0, TL1, TL2, TL3, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: HKTTL<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, R, Err, A>
  ) => HKTTL<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, unknown, Err, A>
}

export interface AccessK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => KindTL<F, TL0, TL1, TL2, TL3, never, never, I, O, never, In, S, R, never, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, R, Err, A>
  ) => KindTL<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, unknown, Err, A>
}

export interface AccessKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly access: <R, A, In, I = In, O = In, S = In>(
    f: (r: R) => A
  ) => KindTL<F, TL0, TL1, TL2, TL3, never, never, I, O, never, In, S, R, E, A>
  readonly provide: <R>(
    r: R
  ) => <K, NK extends string, I, O, X, In, St, Err, A>(
    fa: KindTL<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, R, E, A>
  ) => KindTL<F, TL0, TL1, TL2, TL3, K, NK, I, O, X, In, St, unknown, E, A>
}

export function makeAccess<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    AccessKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => AccessKE<URI, E, TL0, TL1, TL2, TL3>
export function makeAccess<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<AccessK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => AccessK<URI, TL0, TL1, TL2, TL3>
export function makeAccess<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<AccessF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => AccessF<URI, TL0, TL1, TL2, TL3>
export function makeAccess<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<AccessF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => AccessF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
