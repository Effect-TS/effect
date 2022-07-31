import { utfEncodeFor } from "@effect/core/stream/Stream/operations/_internal/utfEncodeFor"

/**
 * @tsplus getter effect/core/stream/Stream utf8Encode
 */
export function utf8Encode<R, E>(
  self: Stream<R, E, string>
): Stream<R, E, number> {
  return self.via(utfEncodeFor())
}
