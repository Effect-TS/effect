import { FoldMapF, FoldMapK } from "../FoldMap"
import { URIS } from "../HKT"
import { ReduceF, ReduceK } from "../Reduce"
import { ReduceRightF, ReduceRightK } from "../ReduceRight"

export type FoldableF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any> = FoldMapF<F, Fix0, Fix1, Fix2, Fix3> &
  ReduceF<F, Fix0, Fix1, Fix2, Fix3> &
  ReduceRightF<F, Fix0, Fix1, Fix2, Fix3>

export type FoldableK<F extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any> = FoldMapK<F, Fix0, Fix1, Fix2, Fix3> &
  ReduceK<F, Fix0, Fix1, Fix2, Fix3> &
  ReduceRightK<F, Fix0, Fix1, Fix2, Fix3>

export function makeFoldable<URI extends URIS, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  _: URI
): (_: Omit<FoldableK<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">) => FoldableK<URI>
export function makeFoldable<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (_: Omit<FoldableF<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">) => FoldableF<URI>
export function makeFoldable<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (_: Omit<FoldableF<URI, Fix0, Fix1, Fix2, Fix3>, "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3">) => FoldableF<URI> {
  return (_) => ({
    URI,
    Fix0: undefined as any, Fix1: undefined as any, Fix2: undefined as any, Fix3: undefined as any,
    ..._
  })
}
