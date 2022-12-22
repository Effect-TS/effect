/**
 * @since 1.0.0
 */
import type { Decoder } from "@fp-ts/schema/Decoder"

/**
 * @since 1.0.0
 */
export const DecoderInputAnnotationId = "@fp-ts/schema/annotation/DecoderInputAnnotation"

/**
 * @since 1.0.0
 */
export interface DecoderInputAnnotation {
  readonly _id: typeof DecoderInputAnnotationId
  readonly handler: (...Decoders: ReadonlyArray<Decoder<any, any>>) => Decoder<any, any>
}

/**
 * @since 1.0.0
 */
export const isDecoderInputAnnotation = (u: unknown): u is DecoderInputAnnotation =>
  typeof u === "object" && u !== null && u["_id"] === DecoderInputAnnotationId

/**
 * @since 1.0.0
 */
export const decoderInputAnnotation = (
  handler: (...Decoders: ReadonlyArray<Decoder<any, any>>) => Decoder<any, any>
): DecoderInputAnnotation => ({ _id: DecoderInputAnnotationId, handler })
