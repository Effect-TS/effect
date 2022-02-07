// ets_tracing: off

import * as A from "../../../Collections/Immutable/Array/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"
import type * as C from "./core.js"
import type * as U from "./utils.js"
import * as ZipWithPar from "./zipWithPar.js"

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 */
export function zipPar_<SN extends readonly C.Sink<any, any, any, any, any, any>[]>(
  ...[s1, s2, ...sinks]: SN & {
    readonly 0: C.Sink<any, any, any, any, any, any>
    readonly 1: C.Sink<any, any, any, any, any, any>
  }
): C.Sink<
  U._R<SN[number]>,
  U._InErr<SN[number]>,
  U._In<SN[number]>,
  U._OutErr<SN[number]>,
  U._L<SN[number]>,
  Tp.Tuple<{
    [K in keyof SN]: U._Z<SN[K]>
  }>
> {
  const init = ZipWithPar.zipWithPar_(s1, s2, Tp.tuple)

  // @ts-expect-error
  return A.reduce_(sinks, init, (acc, v) =>
    // @ts-expect-error
    ZipWithPar.zipWithPar_(acc, v, (a, b) => Tp.append_(a, b))
  )
}

/**
 * Runs both sinks in parallel on the input and combines the results in a tuple.
 *
 * @ets_data_first zipPar_
 */
export function zipPar<SN extends readonly C.Sink<any, any, any, any, any, any>[]>(
  ...[s1, ...sinks]: SN & {
    readonly 0: C.Sink<any, any, any, any, any, any>
  }
) {
  return <R, InErr, In, OutErr, L, Z>(
    self: C.Sink<R, InErr, In, OutErr, L, Z>
  ): C.Sink<
    R & U._R<SN[number]>,
    InErr & U._InErr<SN[number]>,
    In & U._In<SN[number]>,
    OutErr | U._OutErr<SN[number]>,
    L | U._L<SN[number]>,
    Tp.Tuple<
      [
        Z,
        ...{
          [K in keyof SN]: U._Z<SN[K]>
        }
      ]
    >
    // @ts-expect-error
  > => zipPar_(self, s1, ...sinks)
}
