// ets_tracing: off

import type { Stream } from "./definitions.js"
import { mergeAll } from "./mergeAll.js"

/**
 * Like `mergeAll`, but runs all streams concurrently.
 */
export function mergeAllUnbounded(outputBuffer = 16) {
  return <R, E, O>(...streams: Stream<R, E, O>[]): Stream<R, E, O> =>
    mergeAll(Number.MAX_SAFE_INTEGER, outputBuffer)(...streams)
}
