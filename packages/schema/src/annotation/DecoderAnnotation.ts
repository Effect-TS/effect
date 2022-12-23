/**
 * @since 1.0.0
 */
import type { Decoder } from "@fp-ts/schema/Decoder"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const DecoderAnnotationId = "@fp-ts/schema/annotation/DecoderAnnotation"

/**
 * @since 1.0.0
 */
export interface DecoderAnnotation {
  readonly handler: (...Decoders: ReadonlyArray<Decoder<any, any>>) => Decoder<any, any>
}

/**
 * @since 1.0.0
 */
export const decoderAnnotation = (
  handler: (...Decoders: ReadonlyArray<Decoder<any, any>>) => Decoder<any, any>
): DecoderAnnotation => ({ handler })

/**
 * @since 1.0.0
 */
export const getDecoderAnnotation = I.getAnnotation<DecoderAnnotation>(DecoderAnnotationId)
