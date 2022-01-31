// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as H from "../../Has/index.js"
import * as SC from "../../Schedule/index.js"
import * as TR from "../Transducer/index.js"
import { aggregateAsyncWithin_ } from "./aggregateAsyncWithin.js"
import type { Stream } from "./definitions.js"

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 */
export function groupedWithin_<R, E, O>(
  self: Stream<R, E, O>,
  chunkSize: number,
  within: number
): Stream<R & H.Has<CL.Clock>, E, A.Chunk<O>> {
  return aggregateAsyncWithin_(self, TR.collectAllN(chunkSize), SC.spaced(within))
}

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 */
export function groupedWithin(chunkSize: number, within: number) {
  return <R, E, O>(self: Stream<R, E, O>) => groupedWithin_(self, chunkSize, within)
}
