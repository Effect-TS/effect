/**
 * OpenAI text-to-speech models with buffered output and incremental audio bytes.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as AiModel from "effect/ai/Model"
import * as SpeechModel from "effect/ai/SpeechModel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import type * as Generated from "./Generated.ts"
import * as Errors from "./internal/errors.ts"
import { OpenAiClientGenerated } from "./OpenAiClientGenerated.ts"

/**
 * Model identifiers supported by OpenAI speech generation.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Model = (typeof Generated.CreateSpeechRequestJson.Encoded)["model"]

/**
 * Context service for OpenAI speech request defaults and scoped overrides.
 *
 * **Gotchas**
 *
 * `pcm` produces raw signed 16-bit little-endian mono samples at 24 kHz.
 * Transport chunks may split samples or encoded frames.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export class Config extends Context.Service<
  Config,
  Partial<Omit<typeof Generated.CreateSpeechRequestJson.Encoded, "input" | "stream_format">>
>()("@effect/ai-openai/OpenAiSpeechModel/Config") {}

/**
 * Creates an `AiModel` that provides OpenAI speech generation.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const model = (
  model: Model,
  config?: Omit<typeof Config.Service, "model"> | undefined
): AiModel.Model<"openai", SpeechModel.SpeechModel, OpenAiClientGenerated> =>
  AiModel.make("openai", model, layer({ model, config }))

/**
 * Creates an OpenAI speech service using the configured generated client.
 *
 * **Details**
 *
 * Output defaults to MP3 and the `alloy` voice. Scoped configuration overrides
 * constructor defaults; a per-call voice overrides both. Streaming forwards
 * audio bytes without collecting the complete response.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = Effect.fnUntraced(function*({ model, config }: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Effect.fn.Return<SpeechModel.SpeechModel, never, OpenAiClientGenerated> {
  const client = yield* OpenAiClientGenerated
  const resolve = (options: SpeechModel.GenerateSpeechOptions) =>
    Effect.contextWith((services: Context.Context<never>) => {
      const merged = { model, voice: "alloy" as const, ...config, ...Context.getOrUndefined(services, Config) }
      const format = merged.response_format ?? "mp3"
      return Effect.succeed({
        payload: {
          ...merged,
          input: options.text,
          voice: options.voice ?? merged.voice,
          stream_format: "audio" as const
        },
        mediaType: mediaTypes[format]
      })
    })
  const bytes = (payload: typeof Generated.CreateSpeechRequestJson.Encoded, method: string) =>
    client.createSpeechStream({ payload }).pipe(
      Stream.catchTag(
        "HttpClientError",
        (error) => Stream.fromEffect(Errors.mapHttpClientError(error, method))
      )
    )
  return yield* SpeechModel.make({
    generateSpeech: Effect.fnUntraced(function*(options) {
      const { payload, mediaType } = yield* resolve(options)
      const chunks = yield* Stream.runCollect(bytes(payload, "generateSpeech"))
      const audio = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        audio.set(chunk, offset)
        offset += chunk.length
      }
      return { audio, mediaType }
    }),
    streamSpeech: (options) =>
      Stream.unwrap(
        Effect.map(resolve(options), ({ payload, mediaType }) =>
          Stream.succeed<SpeechModel.StreamPart>({ type: "speech-start", mediaType }).pipe(
            Stream.concat(
              bytes(payload, "streamSpeech").pipe(
                Stream.filter((delta) =>
                  delta.length > 0
                ),
                Stream.map((delta): SpeechModel.StreamPart => ({ type: "speech-delta", delta }))
              )
            ),
            Stream.concat(Stream.succeed<SpeechModel.StreamPart>({ type: "speech-end" }))
          ))
      )
  })
})

/**
 * Creates a layer providing OpenAI speech generation.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layer = (options: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Layer.Layer<SpeechModel.SpeechModel, never, OpenAiClientGenerated> =>
  Layer.effect(SpeechModel.SpeechModel, make(options))

/**
 * Provides scoped OpenAI speech request overrides to an effect.
 *
 * **Details**
 *
 * For streams, wrap the consuming effect so overrides remain available while
 * the lazy request runs.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.3
 */
export const withConfigOverride: {
  (overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>
} = dual(
  2,
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service) =>
    Effect.contextWith((services: Context.Context<never>) =>
      Effect.provideService(self, Config, { ...Context.getOrUndefined(services, Config), ...overrides })
    )
)

const mediaTypes = {
  mp3: "audio/mpeg",
  opus: "audio/ogg; codecs=opus",
  aac: "audio/aac",
  flac: "audio/flac",
  wav: "audio/wav",
  pcm: "audio/pcm; rate=24000; channels=1; encoding=pcm_s16le"
} as const satisfies Record<NonNullable<(typeof Generated.CreateSpeechRequestJson.Encoded)["response_format"]>, string>
