import { Utf8 } from "@effect/core/stream/Stream/operations/_internal/bom"
import { utf8DecodeNoBom } from "@effect/core/stream/Stream/operations/_internal/utf8DecodeNoBom"
import { utfDecodeDetectingBom } from "@effect/core/stream/Stream/operations/_internal/utfDecodeDetectingBom"

// TODO(Mike/Max): look into utf16 and utf32 encodings

/**
 * Determines the right encoder to use based on the Byte Order Mark (BOM). If it
 * doesn't detect one, it defaults to utf8Decode.
 *
 * @tsplus getter effect/core/stream/Stream utfDecode
 */
export function utfDecode<R, E>(
  self: Stream<R, E, number>
): Stream<R, E, string> {
  return self.via(
    utfDecodeDetectingBom<R, E>(4, (bytes) =>
      bytes.take(3).corresponds(Utf8, (a, b) => a === b)
        ? Tuple(bytes.drop(3), utf8DecodeNoBom)
        : Tuple(bytes, utf8DecodeNoBom))
  )
}
