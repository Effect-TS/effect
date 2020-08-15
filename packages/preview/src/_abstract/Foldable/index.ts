import { FoldMapF, FoldMapK, FoldMapKE } from "../FoldMap"
import { URIS } from "../HKT"
import { ReduceF, ReduceK, ReduceKE } from "../Reduce"
import { ReduceRightF, ReduceRightK, ReduceRightKE } from "../ReduceRight"

export type FoldableF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any> = FoldMapF<
  F,
  TL0,
  TL1,
  TL2,
  TL3
> &
  ReduceF<F, TL0, TL1, TL2, TL3> &
  ReduceRightF<F, TL0, TL1, TL2, TL3>

export type FoldableK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = FoldMapK<F, TL0, TL1, TL2, TL3> &
  ReduceK<F, TL0, TL1, TL2, TL3> &
  ReduceRightK<F, TL0, TL1, TL2, TL3>

export type FoldableKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> = FoldMapKE<F, E, TL0, TL1, TL2, TL3> &
  ReduceKE<F, E, TL0, TL1, TL2, TL3> &
  ReduceRightKE<F, E, TL0, TL1, TL2, TL3>

export function makeFoldable<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    FoldableKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => FoldableKE<URI, E, TL0, TL1, TL2, TL3>
export function makeFoldable<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<FoldableK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FoldableK<URI, TL0, TL1, TL2, TL3>
export function makeFoldable<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<FoldableF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FoldableF<URI, TL0, TL1, TL2, TL3>
export function makeFoldable<URI>(): <TL0 = any, TL1 = any, TL2 = any, TL3 = any>() => (
  _: Omit<FoldableF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => FoldableF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
