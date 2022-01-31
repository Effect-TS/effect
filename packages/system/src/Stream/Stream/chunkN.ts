// ets_tracing: off

import { rechunk, rechunk_ } from "./rechunk.js"

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 *
 * @deprecated
 */
export const chunkN_ = rechunk_

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 *
 * @deprecated
 */
export const chunkN = rechunk
