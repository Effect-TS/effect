import { textDecodeUsing } from "@effect-ts/core/stream/Stream/operations/_internal/textDecodeUsing";

/**
 * @tsplus fluent ets/Stream uiso_8859_1Decode
 */
export function iso_8859_1Decode<R, E>(
  self: Stream<R, E, number>,
  __tsplusTrace?: string
): Stream<R, E, string> {
  return self.via(textDecodeUsing("iso-8859-1"));
}
