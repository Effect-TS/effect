import type { Stream } from "../definition"
import { textDecodeUsing } from "./_internal/textDecodeUsing"

/**
 * @tsplus fluent ets/Stream usASCIIDecode
 */
export function usASCIIDecode_<R, E>(
  self: Stream<R, E, number>,
  __tsplusTrace?: string
): Stream<R, E, string> {
  return self.via(textDecodeUsing("us-ascii"))
}
