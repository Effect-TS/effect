import { HasE, HasURI, HKTTL, KindTL, URIS } from "../HKT"

/**
 * The identity for combining two values of types `F[A]` and `F[B]`
 */
export interface NoneF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly none: <S, SI, SO = SI>() => HKTTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    never,
    never,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    never,
    never
  >
}

export interface NoneK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly none: <S, SI, SO = SI>() => KindTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    never,
    never,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    never,
    never
  >
}

export interface NoneKE<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3>,
    HasE<E> {
  readonly none: <S, SI, SO = SI>() => KindTL<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    never,
    never,
    SI,
    SO,
    never,
    unknown,
    S,
    unknown,
    E,
    never
  >
}

export function makeNone<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    NoneKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => NoneKE<URI, E, TL0, TL1, TL2, TL3>
export function makeNone<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<NoneK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => NoneK<URI, TL0, TL1, TL2, TL3>
export function makeNone<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<NoneF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => NoneF<URI, TL0, TL1, TL2, TL3>
export function makeNone<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<NoneF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => NoneF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
