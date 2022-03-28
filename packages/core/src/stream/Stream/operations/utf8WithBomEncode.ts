import type { Stream } from "../../Stream"
import { Utf8 } from "./_internal/bom"
import { utfEncodeFor } from "./_internal/utfEncodeFor"

/**
 * @tsplus fluent ets/Stream utf8WithBomEncode
 */
export function utf8WithBomEncode<R, E>(
  self: Stream<R, E, string>,
  __tsplusTrace?: string
): Stream<R, E, number> {
  return self.via(utfEncodeFor(Utf8))
}
