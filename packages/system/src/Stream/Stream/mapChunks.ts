import * as T from "../_internal/effect"
import type * as A from "../../Array"
import { pipe } from "../../Function"
import type { Stream } from "./definitions"
import { mapChunksM } from "./mapChunksM"

/**
 * Transforms the chunks emitted by this stream.
 */
export const mapChunks = <O, O2>(f: (_: A.Array<O>) => A.Array<O2>) => <S, R, E>(
  self: Stream<S, R, E, O>
): Stream<S, R, E, O2> =>
  pipe(
    self,
    mapChunksM((o) => T.succeedNow(f(o)))
  )
