import type * as A from "../../Array"
import type * as CL from "../../Clock"
import type * as H from "../../Has"
import * as SC from "../../Schedule"
import * as TR from "../Transducer"
import { aggregateAsyncWithin_ } from "./aggregateAsyncWithin"
import type { Stream } from "./definitions"

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 */
export function groupedWithin_<R, E, O>(
  self: Stream<R, E, O>,
  chunkSize: number,
  within: number
): Stream<R & H.Has<CL.Clock>, E, A.Array<O>> {
  return aggregateAsyncWithin_(self, TR.collectAllN(chunkSize), SC.spaced(within))
}

/**
 * Partitions the stream with the specified chunkSize or until the specified
 * duration has passed, whichever is satisfied first.
 */
export function groupedWithin(chunkSize: number, within: number) {
  return <R, E, O>(self: Stream<R, E, O>) => groupedWithin_(self, chunkSize, within)
}
