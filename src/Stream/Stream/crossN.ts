import * as A from "../../Array"
import { pipe } from "../../Function"
import type { _A, _E, _R } from "../../Utils"
import { flattenTuples } from "./_internal/flattenTuples"
import { cross_ } from "./cross"
import type { Stream } from "./definitions"
import { map } from "./map"

/**
 * Composes the specified streams to create a cartesian product of elements
 * with a specified function. Subsequent streams would be run multiple times,
 * for every combination of elements in the prior streams.
 *
 * See also `Stream#zipN` for the more common point-wise variant.
 */
export function crossN<SN extends readonly Stream<any, any, any>[]>(
  ...streams: SN & {
    readonly 0: Stream<any, any, any>
    readonly 1: Stream<any, any, any>
  }
) {
  return <O>(
    f: (
      ...os: {
        [k in keyof SN]: _A<SN[k]>
      }
    ) => O
  ): Stream<_R<SN[number]>, _E<SN[number]>, O> => {
    return pipe(
      A.reduce_(A.dropLeft_(streams, 2), cross_(streams[0], streams[1]), cross_),
      map((_) => f(...(flattenTuples(_) as any)))
    )
  }
}
