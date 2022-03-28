import type { Stream } from "../../Stream"
import { utfEncodeFor } from "./_internal/utfEncodeFor"

/**
 * @tsplus fluent ets/Stream utf8Encode
 */
export function utf8Encode<R, E>(
  self: Stream<R, E, string>,
  __tsplusTrace?: string
): Stream<R, E, number> {
  return self.via(utfEncodeFor())
}
