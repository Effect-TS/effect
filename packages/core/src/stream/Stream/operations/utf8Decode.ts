import { Utf8 } from "@effect/core/stream/Stream/operations/_internal/bom"
import { utf8DecodeNoBom } from "@effect/core/stream/Stream/operations/_internal/utf8DecodeNoBom"
import { utfDecodeDetectingBom } from "@effect/core/stream/Stream/operations/_internal/utfDecodeDetectingBom"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"

/**
 * @tsplus getter effect/core/stream/Stream utf8Decode
 * @category mutations
 * @since 1.0.0
 */
export function utf8Decode<R, E>(
  self: Stream<R, E, number>
): Stream<R, E, string> {
  return self.via(
    utfDecodeDetectingBom<R, E>(3, (bom) =>
      Equal.equals(bom, Utf8)
        ? [Chunk.empty, utf8DecodeNoBom]
        : [bom, utf8DecodeNoBom])
  )
}
