import { textDecodeUsing } from "@effect/core/stream/Stream/operations/_internal/textDecodeUsing"

/**
 * @tsplus getter effect/core/stream/Stream usASCIIDecode
 */
export function usASCIIDecode_<R, E>(
  self: Stream<R, E, number>,
  __tsplusTrace?: string
): Stream<R, E, string> {
  return self.via(textDecodeUsing("us-ascii"))
}
