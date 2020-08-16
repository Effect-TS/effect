import { HasE, HasURI, HKTFull, KindFull, URIS } from "../../HKT"

export interface FailF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fail: <E, S, SI>(
    e: E
  ) => HKTFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    never,
    never,
    SI,
    never,
    never,
    unknown,
    S,
    unknown,
    E,
    never
  >
}

export interface FailK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly fail: <E, S, SI>(
    e: E
  ) => KindFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    never,
    never,
    SI,
    never,
    never,
    unknown,
    S,
    unknown,
    E,
    never
  >
}

export interface FailKE<F extends URIS, E, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3>,
    HasE<E> {
  readonly fail: <S, SI>(
    e: E
  ) => KindFull<
    F,
    TL0,
    TL1,
    TL2,
    TL3,
    never,
    never,
    SI,
    never,
    never,
    unknown,
    S,
    unknown,
    E,
    never
  >
}

export function makeFail<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    FailKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => FailKE<URI, E, TL0, TL1, TL2, TL3>
export function makeFail<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<FailK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FailK<URI, TL0, TL1, TL2, TL3>
export function makeFail<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<FailF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FailF<URI, TL0, TL1, TL2, TL3>
export function makeFail<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<FailF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FailF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    Fail: "Fail",
    ..._
  })
}
