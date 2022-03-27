import { Tuple } from "../../../collection/immutable/Tuple"
import type { _A, _E, _R } from "../../../data/Utils"
import type { Stream } from "../definition"

/**
 * @tsplus static ets/StreamOps tuple
 */
export function tuple<SN extends readonly Stream<any, any, any>[]>(
  ...[s1, s2, ...streams]: SN & {
    readonly 0: Stream<any, any, any>
    readonly 1: Stream<any, any, any>
  }
): Stream<
  _R<SN[number]>,
  _E<SN[number]>,
  Tuple<{
    [K in keyof SN]: _A<SN[K]>
  }>
> {
  const init = s1.zip(s2)

  return streams.reduce(
    (acc, v) => acc.zipWith(v, (a, b) => Tuple.mergeTuple(a, b)),
    init
  )
}
