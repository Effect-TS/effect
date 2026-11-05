/**
 * Defines the provider-neutral service for transcribing recorded audio.
 *
 * Each request supplies a complete audio recording and its media type. This
 * module does not upload live microphone frames or manage conversational turns.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Schema from "../Schema.ts"
import * as AiError from "./AiError.ts"

/**
 * Service key for transcribing recorded audio into text.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export const TranscriptionModel: Context.Service<TranscriptionModel, TranscriptionModel> = Context.Service(
  "effect/ai/TranscriptionModel"
)

/**
 * Brand type for `TranscriptionModel`.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.3
 */
export type TypeId = "~effect/ai/TranscriptionModel"

/**
 * Brand for `TranscriptionModel` implementations.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.3
 */
export const TypeId: TypeId = "~effect/ai/TranscriptionModel"

/**
 * Complete recorded audio and optional hints for a transcription request.
 *
 * **Details**
 *
 * `audio` must be nonempty and `mediaType` must identify its encoding. `fileName`
 * is an optional upload filename; `language` and `prompt` are provider hints.
 * Keep the byte array unchanged until the transcription effect completes.
 *
 * @stability unstable
 * @category options
 * @since 4.1.3
 */
export interface TranscribeOptions {
  readonly audio: Uint8Array
  readonly mediaType: string
  readonly fileName?: string | undefined
  readonly language?: string | undefined
  readonly prompt?: string | undefined
}

const NonBlankString = Schema.String.check(Schema.isPattern(/\S/))
const Options = Schema.Struct({
  audio: Schema.Uint8Array.check(Schema.isMinLength(1)),
  mediaType: NonBlankString,
  fileName: Schema.optional(NonBlankString),
  language: Schema.optional(NonBlankString),
  prompt: Schema.optional(Schema.String)
})

/**
 * Recognized text and optional provider-reported language for a recording.
 *
 * **Details**
 *
 * Empty text is valid when the recording contains no recognized speech. An
 * absent language means the provider did not report one, even when the request
 * supplied a language hint.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export class TranscribeResponse extends Schema.Class<TranscribeResponse>(
  "effect/ai/TranscriptionModel/TranscribeResponse"
)({
  text: Schema.String,
  language: Schema.optional(NonBlankString)
}) {}

/**
 * Provider response for a recorded-audio transcription request.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface ProviderResponse {
  readonly text: string
  readonly language?: string | undefined
}

/**
 * Recorded-audio transcription operation.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface TranscriptionModel {
  readonly [TypeId]: TypeId
  readonly transcribe: (options: TranscribeOptions) => Effect.Effect<TranscribeResponse, AiError.AiError>
}

const decodeOptions = Schema.decodeUnknownEffect(Options)
const decodeResponse = Schema.decodeUnknownEffect(TranscribeResponse)

/**
 * Creates a transcription model from a provider implementation.
 *
 * **Details**
 *
 * Validates recorded-audio input before invoking the provider and validates the
 * result as `TranscribeResponse`. Validation failures use `AiError`; provider
 * failures and interruption propagate without retrying the request.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = (params: {
  readonly transcribe: (options: TranscribeOptions) => Effect.Effect<ProviderResponse, AiError.AiError>
}): Effect.Effect<TranscriptionModel> =>
  Effect.sync(() =>
    TranscriptionModel.of({
      [TypeId]: TypeId,
      transcribe: Effect.fn("TranscriptionModel.transcribe")(function*(options: TranscribeOptions) {
        const input = yield* decodeOptions(options).pipe(
          Effect.mapError((error) =>
            AiError.make({
              module: "TranscriptionModel",
              method: "transcribe",
              reason: new AiError.InvalidRequestError({ description: error.message })
            })
          )
        )
        const response = yield* params.transcribe(input)
        return yield* decodeResponse(response).pipe(
          Effect.mapError((error) =>
            AiError.make({
              module: "TranscriptionModel",
              method: "transcribe",
              reason: AiError.InvalidOutputError.fromSchemaError(error)
            })
          )
        )
      })
    })
  )

/**
 * Transcribes a recording using the transcription model in context.
 *
 * @stability unstable
 * @category accessors
 * @since 4.1.3
 */
export const transcribe = Effect.fnUntraced(function*(options: TranscribeOptions) {
  const model = yield* TranscriptionModel
  return yield* model.transcribe(options)
})
