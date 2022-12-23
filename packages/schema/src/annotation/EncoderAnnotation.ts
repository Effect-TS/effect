/**
 * @since 1.0.0
 */
import type { Encoder } from "@fp-ts/schema/Encoder"
import * as I from "@fp-ts/schema/internal/common"

/**
 * @since 1.0.0
 */
export const EncoderAnnotationId = "@fp-ts/schema/annotation/EncoderAnnotation"

/**
 * @since 1.0.0
 */
export interface EncoderAnnotation {
  readonly handler: (...Encoders: ReadonlyArray<Encoder<any, any>>) => Encoder<any, any>
}

/**
 * @since 1.0.0
 */
export const encoderAnnotation = (
  handler: (...Encoders: ReadonlyArray<Encoder<any, any>>) => Encoder<any, any>
): EncoderAnnotation => ({ handler })

/**
 * @since 1.0.0
 */
export const getEncoderAnnotation = I.getAnnotation<EncoderAnnotation>(EncoderAnnotationId)
