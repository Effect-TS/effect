import { Utf8 } from "@effect-ts/core/stream/Stream/operations/_internal/bom";
import { utf8DecodeNoBom } from "@effect-ts/core/stream/Stream/operations/_internal/utf8DecodeNoBom";
import { utfDecodeDetectingBom } from "@effect-ts/core/stream/Stream/operations/_internal/utfDecodeDetectingBom";

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
        : Tuple(bom, utf8DecodeNoBom))
  );
}
