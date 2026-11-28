/**
 * OpenRouter implementation of `TranscriptionModel` for recordings.
 *
 * OpenRouter has no live transcription, so `transcribeLive` fails with an
 * `AiError`.
 *
 * @stability unstable
 * @since 4.1.5
 */
import * as AiModel from "effect/ai/Model"
import * as TranscriptionModel from "effect/ai/TranscriptionModel"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Base64 from "effect/encoding/Base64"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Generated from "./Generated.ts"
import { OpenRouterClient } from "./OpenRouterClient.ts"

declare module "effect/ai/TranscriptionModel" {
  /**
   * OpenRouter metadata returned with a transcription.
   *
   * @stability unstable
   * @category models
   * @since 4.1.5
   */
  export interface TranscribeResponseMetadata {
    readonly openrouter?: {
      /**
       * Credits charged for the request.
       */
      readonly cost?: number
      /**
       * Confidence in the whole transcript, from 0 to 1.
       */
      readonly confidence?: number
      readonly languageConfidence?: number
      /**
       * Segments as OpenRouter returned them, with speaker labels when
       * diarized.
       */
      readonly segments?: Array<{
        id: number
        start: number
        end: number
        text: string
        channel?: number
        speaker?: number
        speaker_label?: string
        avg_logprob?: number
        compression_ratio?: number
        no_speech_prob?: number
      }>
      readonly words?: Array<{
        word: string
        start: number
        end: number
        type?: "word" | "audio_event"
        channel?: number
        confidence?: number
        speaker?: number
        speaker_label?: string
      }>
    }
  }
}

/**
 * Service definition for OpenRouter transcription model configuration.
 *
 * @stability unstable
 * @category services
 * @since 4.1.5
 */
export class Config extends Context.Service<
  Config,
  Omit<typeof Generated.STTRequest.Encoded, "model" | "input_audio">
>()("@effect/ai-openrouter/OpenRouterTranscriptionModel/Config") {}

/**
 * Creates an OpenRouter model that transcribes recordings.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const model = (
  model: string,
  config?: typeof Config.Service
): AiModel.Model<"openrouter", TranscriptionModel.TranscriptionModel, OpenRouterClient> =>
  AiModel.make("openrouter", model, layer({ model, config }))

/**
 * Creates an OpenRouter transcription model for recordings.
 *
 * **Details**
 *
 * Bytes and base64 strings are sent inline. A URL is passed on for the
 * upstream provider to download, which only some providers support. The audio
 * format sent to OpenRouter comes from the extension of `fileName`, or from
 * `mediaType` when there is none.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.5
 */
export const make = Effect.fnUntraced(function*(options: {
  readonly model: string
  readonly config?: typeof Config.Service | undefined
}): Effect.fn.Return<TranscriptionModel.TranscriptionModel, never, OpenRouterClient> {
  const client = yield* OpenRouterClient
  const makeConfig = Effect.contextWith((services: Context.Context<never>) =>
    Effect.succeed({ ...options.config, ...Context.getOrUndefined(services, Config) })
  )
  return yield* TranscriptionModel.make({
    transcribe: Effect.fnUntraced(function*({ audio, language }) {
      const config = yield* makeConfig
      const format = audioFormat(audio)
      const response = yield* client.createTranscription({
        ...config,
        ...(language === undefined ? undefined : { language }),
        model: options.model,
        input_audio: audio.data instanceof URL
          ? { url: audio.data.href, format }
          : { data: typeof audio.data === "string" ? audio.data : Base64.encode(audio.data), format }
      })
      const usage = response.usage
      return {
        text: response.text,
        language: response.language,
        duration: response.duration === undefined ? undefined : Duration.seconds(response.duration),
        segments: response.segments?.map((segment) => ({
          text: segment.text,
          start: Duration.seconds(segment.start),
          end: Duration.seconds(segment.end)
        })),
        usage: {
          inputTokens: usage?.input_tokens,
          outputTokens: usage?.output_tokens,
          audioDuration: usage?.seconds === undefined ? undefined : Duration.seconds(usage.seconds)
        },
        metadata: {
          openrouter: {
            ...(usage?.cost === undefined ? undefined : { cost: usage.cost }),
            ...(response.confidence === undefined ? undefined : { confidence: response.confidence }),
            ...(response.language_confidence === undefined
              ? undefined
              : { languageConfidence: response.language_confidence }),
            ...(response.segments === undefined ? undefined : {
              segments: response.segments.map(({ seek: _, temperature: __, tokens: ___, ...segment }) => segment)
            }),
            ...(response.words === undefined ? undefined : { words: [...response.words] })
          }
        }
      }
    })
  })
})

/**
 * Creates a layer for an OpenRouter transcription model.
 *
 * @stability unstable
 * @category layers
 * @since 4.1.5
 */
export const layer = (options: {
  readonly model: string
  readonly config?: typeof Config.Service | undefined
}): Layer.Layer<TranscriptionModel.TranscriptionModel, never, OpenRouterClient> =>
  Layer.effect(TranscriptionModel.TranscriptionModel, make(options))

/**
 * Provides config overrides for OpenRouter transcription model operations.
 *
 * @stability unstable
 * @category configuration
 * @since 4.1.5
 */
export const withConfigOverride: {
  (overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>
} = dual<
  (
    overrides: typeof Config.Service
  ) => <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>>,
  <A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service) => Effect.Effect<A, E, Exclude<R, Config>>
>(2, (self, overrides) =>
  Effect.flatMap(
    Effect.serviceOption(Config),
    (config) =>
      Effect.provideService(self, Config, {
        ...(config._tag === "Some" ? config.value : {}),
        ...overrides
      })
  ))

const formats: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wave": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a"
}

const audioFormat = (audio: TranscriptionModel.Recording): string => {
  const extension = audio.fileName === undefined ? undefined : /\.([a-zA-Z0-9]+)$/.exec(audio.fileName)?.[1]
  // Media types can carry parameters, as in `audio/webm;codecs=opus`.
  const mediaType = audio.mediaType.split(";", 1)[0].trim()
  return extension?.toLowerCase() ?? formats[mediaType] ?? mediaType.slice(mediaType.indexOf("/") + 1)
}
