import { FoldMapF, FoldMapFE, FoldMapK, FoldMapKE } from "../FoldMap"
import { URIS } from "../HKT"
import { ReduceF, ReduceFE, ReduceK, ReduceKE } from "../Reduce"
import {
  ReduceRightF,
  ReduceRightFE,
  ReduceRightK,
  ReduceRightKE
} from "../ReduceRight"

export type FoldableF<F> = FoldMapF<F> & ReduceF<F> & ReduceRightF<F>

export type FoldableK<F extends URIS> = FoldMapK<F> & ReduceK<F> & ReduceRightK<F>

export type FoldableFE<F, E> = FoldMapFE<F, E> & ReduceFE<F, E> & ReduceRightFE<F, E>

export type FoldableKE<F extends URIS, E> = FoldMapKE<F, E> &
  ReduceKE<F, E> &
  ReduceRightKE<F, E>

export function makeFoldable<URI extends URIS>(
  _: URI
): (_: Omit<FoldableK<URI>, "URI">) => FoldableK<URI>
export function makeFoldable<URI>(
  URI: URI
): (_: Omit<FoldableF<URI>, "URI">) => FoldableF<URI>
export function makeFoldable<URI>(
  URI: URI
): (_: Omit<FoldableF<URI>, "URI">) => FoldableF<URI> {
  return (_) => ({
    URI,
    ..._
  })
}

export function makeFoldableE<URI extends URIS>(
  _: URI
): <E>() => (_: Omit<FoldableKE<URI, E>, "URI" | "E">) => FoldableKE<URI, E>
export function makeFoldableE<URI>(
  URI: URI
): <E>() => (_: Omit<FoldableFE<URI, E>, "URI" | "E">) => FoldableFE<URI, E>
export function makeFoldableE<URI>(
  URI: URI
): <E>() => (_: Omit<FoldableFE<URI, E>, "URI" | "E">) => FoldableFE<URI, E> {
  return () => (_) => ({
    URI,
    E: undefined as any,
    ..._
  })
}
