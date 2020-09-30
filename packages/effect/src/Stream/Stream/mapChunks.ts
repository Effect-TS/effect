import * as T from "../_internal/effect"
import type * as Array from "../../Array"
import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapChunksM } from "./mapChunksM"

/**
 * Transforms the chunks emitted by this stream.
 */
export const mapChunks = <O, O2>(f: (_: Array.Array<O>) => Array.Array<O2>) => <R, E>(
  self: Stream<R, E, O>
): Stream<R, E, O2> =>
  pipe(
    self,
    mapChunksM((o) => T.succeed(f(o)))
  )
