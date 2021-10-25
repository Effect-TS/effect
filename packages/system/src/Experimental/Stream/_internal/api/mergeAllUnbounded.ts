// ets_tracing: off

import type * as C from "../core"
import * as MergeAll from "./mergeAll"

/**
 * Like `mergeAll`, but runs all streams concurrently.
 */
export function mergeAllUnbounded(outputBuffer = 16) {
  return <R, E, O>(...streams: C.Stream<R, E, O>[]) =>
    MergeAll.mergeAll(Number.MAX_SAFE_INTEGER, outputBuffer)(...streams)
}
