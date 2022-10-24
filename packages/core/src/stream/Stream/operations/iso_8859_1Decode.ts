import { textDecodeUsing } from "@effect/core/stream/Stream/operations/_internal/textDecodeUsing"

/**
 * @tsplus getter effect/core/stream/Stream uiso_8859_1Decode
 * @category mutations
 * @since 1.0.0
 */
export function iso_8859_1Decode<R, E>(self: Stream<R, E, number>): Stream<R, E, string> {
  return self.via(textDecodeUsing("iso-8859-1"))
}
