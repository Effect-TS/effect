import { textDecodeUsing } from "@effect-ts/core/stream/Stream/operations/_internal/textDecodeUsing";

/**
 * @tsplus fluent ets/Stream usASCIIDecode
 */
export function usASCIIDecode_<R, E>(
  self: Stream<R, E, number>,
  __tsplusTrace?: string
): Stream<R, E, string> {
  return self.via(textDecodeUsing("us-ascii"));
}
