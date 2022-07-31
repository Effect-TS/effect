import { Utf8 } from "@effect/core/stream/Stream/operations/_internal/bom"
import { utfEncodeFor } from "@effect/core/stream/Stream/operations/_internal/utfEncodeFor"

/**
 * @tsplus getter effect/core/stream/Stream utf8WithBomEncode
 */
export function utf8WithBomEncode<R, E>(
  self: Stream<R, E, string>
): Stream<R, E, number> {
  return self.via(utfEncodeFor(Utf8))
}
