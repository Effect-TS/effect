/**
 * @since 1.0.0
 */
import type { Decoder } from "@fp-ts/schema/Decoder"

/**
 * @since 1.0.0
 */
export const DecoderAnnotationId = "@fp-ts/schema/annotation/DecoderAnnotation"

/**
 * @since 1.0.0
 */
export interface DecoderAnnotation<Config> {
  readonly _id: typeof DecoderAnnotationId
  readonly config: Config
  readonly handler: (
    config: Config,
    ...Decoders: ReadonlyArray<Decoder<any, any>>
  ) => Decoder<any, any>
}

/**
 * @since 1.0.0
 */
export const isDecoderAnnotation = (u: unknown): u is DecoderAnnotation<unknown> =>
  typeof u === "object" && u !== null && u["_id"] === DecoderAnnotationId

/**
 * @since 1.0.0
 */
export const decoderAnnotation = <Config>(
  config: Config,
  handler: (config: Config, ...Decoders: ReadonlyArray<Decoder<any, any>>) => Decoder<any, any>
): DecoderAnnotation<Config> => ({
  _id: DecoderAnnotationId,
  config,
  handler
})
