/**
 * @since 1.0.0
 */
import type { Encoder } from "@fp-ts/schema/Encoder"

/**
 * @since 1.0.0
 */
export const EncoderAnnotationId: unique symbol = Symbol.for(
  "@fp-ts/schema/annotation/EncoderAnnotation"
)

/**
 * @since 1.0.0
 */
export interface EncoderAnnotation<Config> {
  readonly _id: typeof EncoderAnnotationId
  readonly config: Config
  readonly handler: (
    config: Config,
    ...Encoders: ReadonlyArray<Encoder<any, any>>
  ) => Encoder<any, any>
}

/**
 * @since 1.0.0
 */
export const isEncoderAnnotation = (u: unknown): u is EncoderAnnotation<unknown> =>
  typeof u === "object" && u !== null && u["_id"] === EncoderAnnotationId

/**
 * @since 1.0.0
 */
export const encoderAnnotation = <Config>(
  config: Config,
  handler: (config: Config, ...Encoders: ReadonlyArray<Encoder<any, any>>) => Encoder<any, any>
): EncoderAnnotation<Config> => ({
  _id: EncoderAnnotationId,
  config,
  handler
})
