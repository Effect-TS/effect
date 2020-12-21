import * as A from "../../Array"
import { pipe } from "../../Function"
import { flattenTuples } from "./_internal/flattenTuples"
import type { Stream } from "./definitions"
import { map } from "./map"
import { zip_ } from "./zip"

type ZipFunctionParameters<S extends readonly Stream<any, any, unknown>[]> = {
  [K in keyof S]: S[K] extends Stream<any, any, infer R> ? R : never
}

type ZipFunction<S extends readonly Stream<any, any, unknown>[], O> = (
  ...f: ZipFunctionParameters<S>
) => O

/**
 * Zips the specified streams together with the specified function.
 */
export function zipN<
  R,
  E,
  S1 extends Stream<R, E, unknown>,
  S2 extends Stream<R, E, unknown>,
  SN extends readonly Stream<R, E, unknown>[]
>(s1: S1, s2: S2, ...streams: SN) {
  return <O>(f: ZipFunction<[S1, S2, ...SN], O>): Stream<R, E, O> => {
    return pipe(
      A.reduce_(streams, zip_(s1, s2), zip_),
      map((_) => f(...(flattenTuples(_) as ZipFunctionParameters<[S1, S2, ...SN]>)))
    )
  }
}
