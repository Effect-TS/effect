// ets_tracing: off

import * as A from "../../Collections/Immutable/Array/index.js"
import { pipe } from "../../Function/index.js"
import type { _A, _E, _R } from "../../Utils/index.js"
import { flattenTuples } from "./_internal/flattenTuples.js"
import { cross_ } from "./cross.js"
import type { Stream } from "./definitions.js"
import { map } from "./map.js"

/**
 * Composes the specified streams to create a cartesian product of elements
 * with a specified function. Subsequent streams would be run multiple times,
 * for every combination of elements in the prior streams.
 *
 * See also `Stream#zipN` for the more common point-wise variant.
 */
export function crossN<SN extends readonly Stream<any, any, any>[]>(
  ...[s1, s2, ...streams]: SN & {
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
      A.reduce_(streams, cross_(s1, s2), cross_),
      map((_) => f(...(flattenTuples(_) as any)))
    )
  }
}
