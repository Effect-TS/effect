/**
 * @since 1.0.0
 */
import type { Encoder } from "@fp-ts/schema/Encoder"

/**
 * @since 1.0.0
 */
export const EncoderAnnotationId = "@fp-ts/schema/annotation/EncoderAnnotation"

/**
 * @since 1.0.0
 */
export interface EncoderAnnotation {
  readonly _id: typeof EncoderAnnotationId
  readonly handler: (...Encoders: ReadonlyArray<Encoder<any, any>>) => Encoder<any, any>
}

/**
 * @since 1.0.0
 */
export const isEncoderAnnotation = (u: unknown): u is EncoderAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === EncoderAnnotationId

/**
 * @since 1.0.0
 */
export const encoderAnnotation = (
  handler: (...Encoders: ReadonlyArray<Encoder<any, any>>) => Encoder<any, any>
): EncoderAnnotation => ({ _id: EncoderAnnotationId, handler })
