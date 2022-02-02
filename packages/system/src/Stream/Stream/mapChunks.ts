// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { mapChunksM_ } from "./mapChunksM.js"

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, O, O2>(
  self: Stream<R, E, O>,
  f: (_: A.Chunk<O>) => A.Chunk<O2>
): Stream<R, E, O2> {
  return mapChunksM_(self, (o) => T.succeed(f(o)))
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks<O, O2>(f: (_: A.Chunk<O>) => A.Chunk<O2>) {
  return <R, E>(self: Stream<R, E, O>) => mapChunks_(self, f)
}
