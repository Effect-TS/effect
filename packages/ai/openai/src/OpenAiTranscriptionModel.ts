/**
 * OpenAI transcription of recorded audio through multipart uploads.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as AiModel from "effect/ai/Model"
import * as TranscriptionModel from "effect/ai/TranscriptionModel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as HttpClientError from "effect/http/HttpClientError"
import * as Layer from "effect/Layer"
import type * as Generated from "./Generated.ts"
import * as Errors from "./internal/errors.ts"
import { OpenAiClientGenerated } from "./OpenAiClientGenerated.ts"

/**
 * Model identifiers supported by OpenAI recorded audio transcription.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type Model = (typeof Generated.CreateTranscriptionRequestFormData.Encoded)["model"]

/**
 * Context service for OpenAI recorded transcription request overrides.
 *
 * **Details**
 *
 * Responses use JSON and complete recorded uploads. This service does not
 * create a live microphone or realtime transcription session.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export class Config extends Context.Service<
  Config,
  Partial<Omit<typeof Generated.CreateTranscriptionRequestFormData.Encoded, "file" | "stream" | "response_format">>
>()("@effect/ai-openai/OpenAiTranscriptionModel/Config") {}

/**
 * Creates an `AiModel` providing OpenAI recorded transcription.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const model = (
  model: Model,
  config?: Omit<typeof Config.Service, "model"> | undefined
): AiModel.Model<"openai", TranscriptionModel.TranscriptionModel, OpenAiClientGenerated> =>
  AiModel.make("openai", model, layer({ model, config }))

/**
 * Creates an OpenAI service for transcribing recorded audio uploads.
 *
 * **Gotchas**
 *
 * Supply a filename with the extension of the actual audio container. When
 * omitted, a filename is inferred from common audio media types. The adapter
 * does not encode raw PCM into an upload container.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = Effect.fnUntraced(function*({ model, config }: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Effect.fn.Return<TranscriptionModel.TranscriptionModel, never, OpenAiClientGenerated> {
  const client = yield* OpenAiClientGenerated
  return yield* TranscriptionModel.make({
    transcribe: Effect.fnUntraced(function*(options) {
      const services = yield* Effect.context<never>()
      const merged = { model, ...config, ...Context.getOrUndefined(services, Config) }
      const file = new File([new Uint8Array(options.audio)], options.fileName ?? inferFileName(options.mediaType), {
        type: options.mediaType
      })
      const result = yield* client.createTranscription({
        payload: {
          ...merged,
          file,
          ...(options.language !== undefined ? { language: options.language } : {}),
          ...(options.prompt !== undefined ? { prompt: options.prompt } : {}),
          response_format: "json",
          stream: false
        }
      }).pipe(
        Effect.catch((error) => {
          if (error._tag === "HttpClientError") return Errors.mapHttpClientError(error, "transcribe")
          if (error._tag === "SchemaError") return Effect.fail(Errors.mapSchemaError(error, "transcribe"))
          return Errors.mapHttpClientError(
            new HttpClientError.HttpClientError({
              reason: new HttpClientError.StatusCodeError({
                request: error.request,
                response: error.response,
                description: JSON.stringify(error.cause)
              })
            }),
            "transcribe"
          )
        })
      )
      const language = "language" in result
        ? result.language
        : "languages" in result && result.languages?.length === 1
        ? result.languages[0].code
        : undefined
      return { text: result.text, ...(language !== undefined ? { language } : {}) }
    })
  })
})

/**
 * Creates a layer providing OpenAI recorded transcription.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.3
 */
export const layer = (options: {
  readonly model: Model
  readonly config?: Omit<typeof Config.Service, "model"> | undefined
}): Layer.Layer<TranscriptionModel.TranscriptionModel, never, OpenAiClientGenerated> =>
  Layer.effect(TranscriptionModel.TranscriptionModel, make(options))

/**
 * Provides scoped OpenAI recorded transcription request overrides.
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

const inferFileName = (mediaType: string): string => {
  const type = mediaType.split(";", 1)[0].trim().toLowerCase()
  const extensions: Record<string, string> = {
    "audio/wav": "wav",
    "audio/wave": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/flac": "flac"
  }
  return `audio.${extensions[type] ?? "bin"}`
}
