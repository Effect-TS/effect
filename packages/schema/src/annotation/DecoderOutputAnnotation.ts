/**
 * @since 1.0.0
 */
import type { Decoder } from "@fp-ts/schema/Decoder"

/**
 * @since 1.0.0
 */
export const DecoderOutputAnnotationId = "@fp-ts/schema/annotation/DecoderOutputAnnotation"

/**
 * @since 1.0.0
 */
export interface DecoderOutputAnnotation<I, A> {
  readonly _id: typeof DecoderOutputAnnotationId
  readonly handler: (decoder: Decoder<I, A>) => Decoder<I, A>
}

/**
 * @since 1.0.0
 */
export const isDecoderOutputAnnotation = (
  u: unknown
): u is DecoderOutputAnnotation<any, any> =>
  typeof u === "object" && u !== null && u["_id"] === DecoderOutputAnnotationId

/**
 * @since 1.0.0
 */
export const decoderOutputAnnotation = <I, A>(
  handler: (decoder: Decoder<I, A>) => Decoder<I, A>
): DecoderOutputAnnotation<I, A> => ({ _id: DecoderOutputAnnotationId, handler })
