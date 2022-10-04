import { Utf8 } from "@effect/core/stream/Stream/operations/_internal/bom"
import { utf8DecodeNoBom } from "@effect/core/stream/Stream/operations/_internal/utf8DecodeNoBom"
import { utfDecodeDetectingBom } from "@effect/core/stream/Stream/operations/_internal/utfDecodeDetectingBom"

/**
 * @tsplus getter effect/core/stream/Stream utf8Decode
 */
export function utf8Decode<R, E>(
  self: Stream<R, E, number>
): Stream<R, E, string> {
  return self.via(
    utfDecodeDetectingBom<R, E>(3, (bom) =>
      bom.corresponds(Utf8, (a, b) => a === b)
        ? [Chunk.empty(), utf8DecodeNoBom]
        : [bom, utf8DecodeNoBom])
  )
}
