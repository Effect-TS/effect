/**
 * Defines the provider-neutral service for synthesizing speech from text.
 *
 * Speech can be returned as a complete encoded audio response or streamed as
 * ordered byte chunks. This module does not manage playback or live voice
 * sessions. Providers select the output encoding through their configuration.
 *
 * @stability unstable
 * @since 4.1.3
 */
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Schema from "../Schema.ts"
import * as Stream from "../Stream.ts"
import * as AiError from "./AiError.ts"

/**
 * Service key for synthesizing speech from text.
 *
 * @stability unstable
 * @category services
 * @since 4.1.3
 */
export const SpeechModel: Context.Service<SpeechModel, SpeechModel> = Context.Service("effect/ai/SpeechModel")

/**
 * Brand type for `SpeechModel`.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.3
 */
export type TypeId = "~effect/ai/SpeechModel"

/**
 * Brand for `SpeechModel` implementations.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.1.3
 */
export const TypeId: TypeId = "~effect/ai/SpeechModel"

/**
 * Input shared by complete and streaming speech synthesis operations.
 *
 * **Details**
 *
 * `text` must contain a non-whitespace character. `voice`, when supplied, is a
 * nonblank provider-specific voice identifier.
 *
 * @stability unstable
 * @category options
 * @since 4.1.3
 */
export interface GenerateSpeechOptions {
  readonly text: string
  readonly voice?: string | undefined
}

const NonBlankString = Schema.String.check(Schema.isPattern(/\S/))
const AudioBytes = Schema.Uint8Array.check(Schema.isMinLength(1))
const Options = Schema.Struct({
  text: NonBlankString,
  voice: Schema.optional(NonBlankString)
})

/**
 * Complete encoded audio response produced by speech synthesis.
 *
 * **Details**
 *
 * `mediaType` identifies the audio encoding, including parameters needed for
 * raw audio. The byte array is nonempty and is not copied by this module.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export class GenerateSpeechResponse extends Schema.Class<GenerateSpeechResponse>(
  "effect/ai/SpeechModel/GenerateSpeechResponse"
)({
  audio: AudioBytes,
  mediaType: NonBlankString
}) {}

/**
 * Provider response for complete speech synthesis.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface ProviderResponse {
  readonly audio: Uint8Array
  readonly mediaType: string
}

/**
 * Ordered parts of a streamed speech response.
 *
 * **Details**
 *
 * One `speech-start` declares the media type, one or more `speech-delta` parts
 * carry nonempty byte chunks, and one `speech-end` completes the response.
 * Chunks form one encoded audio sequence and need not be independently playable.
 * Providers must not mutate or recycle emitted byte arrays.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export type StreamPart =
  | { readonly type: "speech-start"; readonly mediaType: string }
  | { readonly type: "speech-delta"; readonly delta: Uint8Array }
  | { readonly type: "speech-end" }

/**
 * Schema for the metadata, byte chunks and completion of streamed speech.
 *
 * @stability unstable
 * @category schemas
 * @since 4.1.3
 */
export const StreamPart = Schema.Union([
  Schema.Struct({ type: Schema.Literal("speech-start"), mediaType: NonBlankString }),
  Schema.Struct({ type: Schema.Literal("speech-delta"), delta: AudioBytes }),
  Schema.Struct({ type: Schema.Literal("speech-end") })
])

/**
 * Complete and streaming speech synthesis operations.
 *
 * @stability unstable
 * @category models
 * @since 4.1.3
 */
export interface SpeechModel {
  readonly [TypeId]: TypeId
  readonly generateSpeech: (options: GenerateSpeechOptions) => Effect.Effect<GenerateSpeechResponse, AiError.AiError>
  readonly streamSpeech: (options: GenerateSpeechOptions) => Stream.Stream<StreamPart, AiError.AiError>
}

const decodeOptions = Schema.decodeUnknownEffect(Options)
const decodeResponse = Schema.decodeUnknownEffect(GenerateSpeechResponse)
const decodePart = Schema.decodeUnknownEffect(StreamPart)

const invalidRequest = (method: string, description: string): AiError.AiError =>
  AiError.make({ module: "SpeechModel", method, reason: new AiError.InvalidRequestError({ description }) })

const invalidOutput = (method: string, description: string): AiError.AiError =>
  AiError.make({ module: "SpeechModel", method, reason: new AiError.InvalidOutputError({ description }) })

/**
 * Creates a speech model from complete and streaming provider implementations.
 *
 * **Details**
 *
 * Requests and responses are validated in the typed `AiError` channel. Provider
 * failures propagate unchanged. Streaming invokes the provider only when
 * consumed, validates part ordering with constant state, and never collects the
 * audio. Early stream termination releases provider stream resources normally.
 *
 * **Gotchas**
 *
 * Both implementations are required. Complete generation does not collect the
 * streaming implementation, and streaming does not buffer complete generation.
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.3
 */
export const make = (params: {
  readonly generateSpeech: (options: GenerateSpeechOptions) => Effect.Effect<ProviderResponse, AiError.AiError>
  readonly streamSpeech: (options: GenerateSpeechOptions) => Stream.Stream<StreamPart, AiError.AiError>
}): Effect.Effect<SpeechModel> =>
  Effect.sync(() =>
    SpeechModel.of({
      [TypeId]: TypeId,
      generateSpeech: Effect.fn("SpeechModel.generateSpeech")(function*(options: GenerateSpeechOptions) {
        const input = yield* decodeOptions(options).pipe(
          Effect.mapError((error) => invalidRequest("generateSpeech", error.message))
        )
        const response = yield* params.generateSpeech(input)
        return yield* decodeResponse(response).pipe(
          Effect.mapError((error) => invalidOutput("generateSpeech", error.message))
        )
      }),
      streamSpeech: (options) =>
        Stream.unwrap(Effect.gen(function*() {
          const input = yield* decodeOptions(options).pipe(
            Effect.mapError((error) => invalidRequest("streamSpeech", error.message))
          )
          let state: "initial" | "started" | "streaming" | "ended" = "initial"
          return params.streamSpeech(input).pipe(
            Stream.mapEffect(Effect.fnUntraced(function*(input) {
              const part = yield* decodePart(input).pipe(
                Effect.mapError((error) => invalidOutput("streamSpeech", error.message))
              )
              switch (part.type) {
                case "speech-start":
                  if (state !== "initial") {
                    return yield* invalidOutput("streamSpeech", "Expected exactly one initial speech-start part")
                  }
                  state = "started"
                  break
                case "speech-delta":
                  if (state !== "started" && state !== "streaming") {
                    return yield* invalidOutput("streamSpeech", "Received speech-delta outside an active response")
                  }
                  state = "streaming"
                  break
                case "speech-end":
                  if (state !== "streaming") {
                    return yield* invalidOutput("streamSpeech", "Expected audio before speech-end")
                  }
                  state = "ended"
                  break
              }
              return part
            })),
            Stream.onEnd(Effect.suspend(() =>
              state === "ended"
                ? Effect.void
                : Effect.fail(invalidOutput("streamSpeech", "Speech stream ended without speech-end"))
            ))
          )
        })).pipe(Stream.withSpan("SpeechModel.streamSpeech"))
    })
  )

/**
 * Synthesizes a complete audio response using the speech model in context.
 *
 * @see {@link streamSpeech} for incremental audio without collecting a response
 *
 * @stability unstable
 * @category accessors
 * @since 4.1.3
 */
export const generateSpeech = Effect.fnUntraced(function*(options: GenerateSpeechOptions) {
  const model = yield* SpeechModel
  return yield* model.generateSpeech(options)
})

/**
 * Streams encoded audio parts using the speech model in context.
 *
 * @see {@link generateSpeech} for a complete encoded audio response
 *
 * @stability unstable
 * @category accessors
 * @since 4.1.3
 */
export const streamSpeech = (
  options: GenerateSpeechOptions
): Stream.Stream<StreamPart, AiError.AiError, SpeechModel> =>
  Stream.unwrap(Effect.map(SpeechModel, (model) => model.streamSpeech(options)))
