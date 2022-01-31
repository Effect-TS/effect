// ets_tracing: off

import * as A from "../../../../Collections/Immutable/Array/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import type { _A, _E, _R } from "../../../../Utils/index.js"
import type * as C from "../core.js"
import * as ZipWith from "./zipWith.js"

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 */

export function zip_<SN extends readonly C.Stream<any, any, any>[]>(
  ...[s1, s2, ...streams]: SN & {
    readonly 0: C.Stream<any, any, any>
    readonly 1: C.Stream<any, any, any>
  }
): C.Stream<
  _R<SN[number]>,
  _E<SN[number]>,
  Tp.Tuple<{
    [K in keyof SN]: _A<SN[K]>
  }>
> {
  const init = ZipWith.zipWith_(s1, s2, Tp.tuple)

  // @ts-expect-error
  return A.reduce_(streams, init, (acc, v) =>
    // @ts-expect-error
    ZipWith.zipWith_(acc, v, (a, b) => Tp.append_(a, b))
  )
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @ets_data_first zip_
 */
export function zip<SN extends readonly C.Stream<any, any, any>[]>(
  ...[s1, ...streams]: SN & {
    readonly 0: C.Stream<any, any, any>
  }
) {
  return <R, E, A>(
    self: C.Stream<R, E, A>
  ): C.Stream<
    R & _R<SN[number]>,
    E | _E<SN[number]>,
    Tp.Tuple<
      [
        A,
        ...{
          [K in keyof SN]: _A<SN[K]>
        }
      ]
    >
  > =>
    // @ts-expect-error
    zip_(self, s1, ...streams)
}
