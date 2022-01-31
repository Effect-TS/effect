// ets_tracing: off

import * as A from "../../Collections/Immutable/Array/index.js"
import { pipe } from "../../Function/index.js"
import type { _A, _E, _R } from "../../Utils/index.js"
import { flattenTuples } from "./_internal/flattenTuples.js"
import type { Stream } from "./definitions.js"
import { map } from "./map.js"
import { zip_ } from "./zip.js"

/**
 * Zips the specified streams together with the specified function.
 */
export function zipN<SN extends readonly Stream<any, any, any>[]>(
  ...[s1, s2, ...streams]: SN & {
    readonly 0: Stream<any, any, any>
    readonly 1: Stream<any, any, any>
  }
) {
  return <O>(
    f: (...os: { [K in keyof SN]: _A<SN[K]> }) => O
  ): Stream<_R<SN[number]>, _E<SN[number]>, O> => {
    return pipe(
      A.reduce_(streams, zip_(s1, s2), zip_),
      map((_) => f(...(flattenTuples(_) as any)))
    )
  }
}
