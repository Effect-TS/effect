/**
 * @since 1.0.0
 */
import type { Decoder } from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const DecoderOutputAnnotationId = "@fp-ts/schema/annotation/DecoderOutputAnnotation"

/**
 * @since 1.0.0
 */
export interface DecoderOutputAnnotation<I, A> {
  readonly handler: (decoder: Decoder<I, A>) => Decoder<I, A>
}

/**
 * @since 1.0.0
 */
export const decoderOutputAnnotation = <I, A>(
  handler: (decoder: Decoder<I, A>) => Decoder<I, A>
): DecoderOutputAnnotation<I, A> => ({ handler })

/**
 * @since 1.0.0
 */
export const getDecoderOuputAnnotation = I.getAnnotation<DecoderOutputAnnotation<any, any>>(
  DecoderOutputAnnotationId
)
