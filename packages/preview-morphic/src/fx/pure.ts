import { XPure } from "@matechs/preview/XPure"
import { HasE, HasURI, HKTFull, KindFull, URIS } from "@matechs/preview/_abstract/HKT"

export interface FromXPureF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fromXPure: <R, E, A>(
    fa: XPure<unknown, unknown, R, E, A>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, R, E, A>
}

export interface FromXPureK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fromXPure: <R, E, A>(
    fa: XPure<unknown, unknown, R, E, A>
  ) => KindFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, R, E, A>
}

export interface FromXPureKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly fromXPure: <R, E, A>(
    fa: XPure<unknown, unknown, R, E, A>
  ) => KindFull<F, TL0, TL1, TL2, TL3, any, any, any, any, any, any, any, R, E, A>
}

export function makeFromXPure<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    FromXPureKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => FromXPureKE<URI, E, TL0, TL1, TL2, TL3>
export function makeFromXPure<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<FromXPureK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FromXPureK<URI, TL0, TL1, TL2, TL3>
export function makeFromXPure<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<FromXPureF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FromXPureF<URI, TL0, TL1, TL2, TL3>
export function makeFromXPure<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<FromXPureF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FromXPureF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    FromXPure: "FromXPure",
    ..._
  })
}
