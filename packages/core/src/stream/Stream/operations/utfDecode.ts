import { Utf8 } from "@effect/core/stream/Stream/operations/_internal/bom"
import { utf8DecodeNoBom } from "@effect/core/stream/Stream/operations/_internal/utf8DecodeNoBom"
import { utfDecodeDetectingBom } from "@effect/core/stream/Stream/operations/_internal/utfDecodeDetectingBom"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

// TODO(Mike/Max): look into utf16 and utf32 encodings

/**
 * Determines the right encoder to use based on the Byte Order Mark (BOM). If it
 * doesn't detect one, it defaults to utf8Decode.
 *
 * @tsplus getter effect/core/stream/Stream utfDecode
 * @category mutations
 * @since 1.0.0
 */
export function utfDecode<R, E>(
  self: Stream<R, E, number>
): Stream<R, E, string> {
  return self.via(
    utfDecodeDetectingBom<R, E>(4, (bytes) =>
      Equal.equals(pipe(bytes, Chunk.take(3)), Utf8)
        ? [pipe(bytes, Chunk.drop(3)), utf8DecodeNoBom]
        : [bytes, utf8DecodeNoBom])
  )
}
