// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import { DefaultChunkSize, Stream } from "./definitions.js"

/**
 * Constructs a stream from a range of integers (lower bound included, upper bound not included)
 */
export function range(
  min: number,
  max: number,
  chunkSize: number = DefaultChunkSize
): Stream<unknown, never, number> {
  const pull = (ref: Ref.Ref<number>) =>
    pipe(
      T.do,
      T.bind("start", () => Ref.getAndUpdate_(ref, (_) => _ + chunkSize)),
      T.tap(({ start }) => T.when_(T.fail(O.none), () => start >= max + 1)),
      T.map(({ start }) => A.range(start, Math.min(start + chunkSize, max)))
    )

  return new Stream(M.map_(Ref.makeManagedRef(min), pull))
}
