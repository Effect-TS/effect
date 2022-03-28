import { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { Stream } from "../definition"
import { Utf8 } from "./_internal/bom"
import { utf8DecodeNoBom } from "./_internal/utf8DecodeNoBom"
import { utfDecodeDetectingBom } from "./_internal/utfDecodeDetectingBom"

/**
 * @tsplus fluent ets/Stream utf8Decode
 */
export function utf8Decode<R, E>(
  self: Stream<R, E, number>,
  __tsplusTrace?: string
): Stream<R, E, string> {
  return self.via(
    utfDecodeDetectingBom<R, E>(3, (bom) =>
      bom.corresponds(Utf8, (a, b) => a === b)
        ? Tuple(Chunk.empty(), utf8DecodeNoBom)
        : Tuple(bom, utf8DecodeNoBom)
    )
  )
}
