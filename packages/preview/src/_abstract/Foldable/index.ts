import { FoldMapF, FoldMapK } from "../FoldMap"
import { URIS } from "../HKT"
import { ReduceF, ReduceK } from "../Reduce"
import { ReduceRightF, ReduceRightK } from "../ReduceRight"

export type FoldableF<F, Fix = any> = FoldMapF<F, Fix> &
  ReduceF<F, Fix> &
  ReduceRightF<F, Fix>

export type FoldableK<F extends URIS, Fix = any> = FoldMapK<F, Fix> &
  ReduceK<F, Fix> &
  ReduceRightK<F, Fix>

export function makeFoldable<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<FoldableK<URI, Fix>, "URI" | "Fix">) => FoldableK<URI>
export function makeFoldable<URI, Fix = any>(
  URI: URI
): (_: Omit<FoldableF<URI, Fix>, "URI" | "Fix">) => FoldableF<URI>
export function makeFoldable<URI, Fix = any>(
  URI: URI
): (_: Omit<FoldableF<URI, Fix>, "URI" | "Fix">) => FoldableF<URI> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    ..._
  })
}
