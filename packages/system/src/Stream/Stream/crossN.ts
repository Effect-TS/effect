import * as A from "../../Array"
import { pipe } from "../../Function"
import { flattenTuples } from "./_internal/flattenTuples"
import { cross_ } from "./cross"
import type { Stream } from "./definitions"
import { map } from "./map"

type CrossNFunctionParameters<S extends readonly Stream<any, any, unknown>[]> = {
  [K in keyof S]: S[K] extends Stream<any, any, infer R> ? R : never
}

type CrossNFunction<S extends readonly Stream<any, any, unknown>[], O> = (
  ...f: CrossNFunctionParameters<S>
) => O

/**
 * Composes the specified streams to create a cartesian product of elements
 * with a specified function. Subsequent streams would be run multiple times,
 * for every combination of elements in the prior streams.
 *
 * See also `Stream#zipN` for the more common point-wise variant.
 */
export function crossN<
  R,
  E,
  S1 extends Stream<R, E, unknown>,
  S2 extends Stream<R, E, unknown>,
  SN extends readonly Stream<R, E, unknown>[]
>(s1: S1, s2: S2, ...streams: SN) {
  return <O>(f: CrossNFunction<[S1, S2, ...SN], O>): Stream<R, E, O> => {
    return pipe(
      A.reduce_(streams, cross_(s1, s2), cross_),
      map((_) => f(...(flattenTuples(_) as CrossNFunctionParameters<[S1, S2, ...SN]>)))
    )
  }
}
