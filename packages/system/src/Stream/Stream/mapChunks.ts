import type * as Array from "../../Array"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { mapChunksM_ } from "./mapChunksM"

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, O, O2>(
  self: Stream<R, E, O>,
  f: (_: Array.Array<O>) => Array.Array<O2>
): Stream<R, E, O2> {
  return mapChunksM_(self, (o) => T.succeed(f(o)))
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks<O, O2>(f: (_: Array.Array<O>) => Array.Array<O2>) {
  return <R, E>(self: Stream<R, E, O>) => mapChunks_(self, f)
}
