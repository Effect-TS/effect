// ets_tracing: off

import * as A from "../../../../Collections/Immutable/Array/index.js"
import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import type { _A, _E, _R } from "../../../../Utils/index.js"
import type * as C from "../core.js"
import * as CrossWith from "./crossWith.js"

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function cross_<SN extends readonly C.Stream<any, any, any>[]>(
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
  const init = CrossWith.crossWith_(s1, s2, Tp.tuple)

  // @ts-expect-error
  return A.reduce_(streams, init, (acc, v) =>
    // @ts-expect-error
    CrossWith.crossWith_(acc, v, (a, b) => Tp.append_(a, b))
  )
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * @ets_data_first cross_
 */
export function cross<SN extends readonly C.Stream<any, any, any>[]>(
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
    cross_(self, s1, ...streams)
}
