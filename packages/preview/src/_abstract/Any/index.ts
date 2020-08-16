import { HasE, HasURI, HKTFull, KindFull, URIS } from "../HKT"

/**
 * Model () => F[Any]
 */
export interface AnyF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly any: <S, SI, SO = SI>() => HKTFull<
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
    unknown
  >
}

export interface AnyK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly any: <S, SI, SO = SI>() => KindFull<
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
    unknown
  >
}

export interface AnyKE<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3>,
    HasE<E> {
  readonly any: <S, SI, SO = SI>() => KindFull<
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
    unknown
  >
}

export function makeAny<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    AnyKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => AnyKE<URI, E, TL0, TL1, TL2, TL3>
export function makeAny<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<AnyK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => AnyK<URI, TL0, TL1, TL2, TL3>
export function makeAny<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<AnyF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => AnyF<URI, TL0, TL1, TL2, TL3>
export function makeAny<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<AnyF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => AnyF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
