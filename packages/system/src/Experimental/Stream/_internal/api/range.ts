// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Constructs a stream from a range of integers (lower bound included, upper bound not included)
 */
export function range(
  min: number,
  max: number,
  chunkSize = C.DEFAULT_CHUNK_SIZE
): C.UIO<number> {
  const go = (
    current: number
  ): CH.Channel<unknown, unknown, unknown, unknown, never, CK.Chunk<number>, any> => {
    const remaining = max - current

    if (remaining > chunkSize) {
      return CH.zipRight_(
        CH.write(CK.range(current, current + chunkSize)),
        go(current + chunkSize)
      )
    } else {
      return CH.write(CK.range(current, current + remaining))
    }
  }

  return new C.Stream(go(min))
}
