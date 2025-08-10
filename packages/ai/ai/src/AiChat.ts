/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type { NoExcessProperties } from "effect/Types"
import type { AiError } from "./AiError.js"
import * as AiLanguageModel from "./AiLanguageModel.js"
import * as AiPrompt from "./AiPrompt.js"
import * as AiResponse from "./AiResponse.js"
import type * as AiTool from "./AiTool.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class AiChat extends Context.Tag("@effect/ai/AiChat")<AiChat, Service>() {}

/**
 * Represents the interface that the `AiChat` service provides.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * The chat history.
   */
  readonly history: Ref.Ref<AiPrompt.AiPrompt>

  /**
   * Exports the chat into a structured format.
   */
  readonly export: Effect.Effect<unknown>

  /**
   * Exports the chat as a JSON string.
   */
  readonly exportJson: Effect.Effect<string>

  /**
   * Generate text using a large language model for the specified `prompt`.
   *
   * If a `toolkit` is specified, the large language model will additionally
   * be able to perform tool calls to augment its response.
   *
   * Both input and output messages will be added to the chat history.
   */
  readonly generateText: <
    Tools extends Record<string, AiTool.Any>,
    Options extends NoExcessProperties<AiLanguageModel.GenerateTextOptions<any>, Options>
  >(
    options: Options & Omit<AiLanguageModel.GenerateTextOptions<Tools>, "system">
  ) => Effect.Effect<
    AiLanguageModel.ExtractSuccess<Options>,
    AiLanguageModel.ExtractError<Options>,
    AiLanguageModel.ExtractRequirements<Options>
  >

  /**
   * Generate text using a large language model for the specified `prompt`,
   * streaming output from the model as soon as it is available.
   *
   * If a `toolkit` is specified, the large language model will additionally
   * be able to perform tool calls to augment its response.
   *
   * Both input and output messages will be added to the chat history.
   */
  readonly streamText: <
    Tools extends Record<string, AiTool.Any>,
    Options extends NoExcessProperties<AiLanguageModel.GenerateTextOptions<any>, Options>
  >(
    options: Options & Omit<AiLanguageModel.GenerateTextOptions<Tools>, "system">
  ) => Stream.Stream<
    AiLanguageModel.ExtractSuccess<Options>,
    AiLanguageModel.ExtractError<Options>,
    AiLanguageModel.ExtractRequirements<Options>
  >

  /**
   * Generate a structured object for the specified prompt and schema using a
   * large language model.
   *
   * When using a `Schema` that does not have an `identifier` or `_tag`
   * property, you must specify a `toolCallId` to properly associate the
   * output of the model.
   *
   * Both input and output messages will be added to the chat history.
   */
  readonly generateObject: <A, I extends Record<string, unknown>, R>(
    options: Omit<AiLanguageModel.GenerateObjectOptions<A, I, R>, "system">
  ) => Effect.Effect<AiResponse.WithStructuredOutput<A>, AiError, R>
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromPrompt = Effect.fnUntraced(function*(
  prompt: AiPrompt.RawInput
) {
  const languageModel = yield* AiLanguageModel.AiLanguageModel
  const context = yield* Effect.context<never>()
  const provideContext = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.mapInputContext(effect, (input) => Context.merge(context, input))
  const provideContextStream = <A, E, R>(stream: Stream.Stream<A, E, R>): Stream.Stream<A, E, R> =>
    Stream.mapInputContext(stream, (input) => Context.merge(context, input))
  const history = yield* Ref.make<AiPrompt.AiPrompt>(AiPrompt.make(prompt))
  const semaphore = yield* Effect.makeSemaphore(1)

  return AiChat.of({
    history,
    export: Ref.get(history).pipe(
      Effect.flatMap(Schema.encode(AiPrompt.AiPrompt)),
      Effect.orDie
    ),
    exportJson: Ref.get(history).pipe(
      Effect.flatMap(Schema.encode(AiPrompt.FromJson)),
      Effect.orDie
    ),
    generateText(options) {
      const newInput = AiPrompt.make(options.prompt)
      return Ref.get(history).pipe(
        Effect.flatMap((oldInput) => {
          const input = AiPrompt.merge(oldInput, newInput)
          return languageModel.generateText({ ...options, prompt: input }).pipe(
            Effect.tap((response) => {
              const modelInput = AiPrompt.make(response)
              return Ref.set(history, AiPrompt.merge(input, modelInput))
            }),
            provideContext
          )
        }),
        semaphore.withPermits(1),
        Effect.withSpan("AiChat.generateText", { captureStackTrace: false })
      )
    },
    streamText(options) {
      return Stream.suspend(() => {
        let combined = AiResponse.empty
        return Stream.fromChannel(Channel.acquireUseRelease(
          semaphore.take(1).pipe(
            Effect.zipRight(Ref.get(history)),
            Effect.map((history) => AiPrompt.merge(history, AiPrompt.make(options.prompt)))
          ),
          (parts) =>
            languageModel.streamText({ ...options, prompt: parts }).pipe(
              Stream.map((chunk) => {
                combined = AiResponse.merge(combined, chunk)
                return chunk
              }),
              Stream.toChannel
            ),
          (parts) =>
            Effect.zipRight(
              Ref.set(history, AiPrompt.merge(parts, AiPrompt.make(combined))),
              semaphore.release(1)
            )
        ))
      }).pipe(
        provideContextStream,
        Stream.withSpan("AiChat.streamText", {
          captureStackTrace: false
        })
      ) as any
    },
    generateObject(options) {
      const newInput = AiPrompt.make(options.prompt)
      return Ref.get(history).pipe(
        Effect.flatMap((oldInput) => {
          const prompt = AiPrompt.merge(oldInput, newInput)
          return languageModel.generateObject({ ...options, prompt }).pipe(
            Effect.flatMap((response) => {
              const modelInput = AiPrompt.make(response)
              return Effect.as(
                Ref.set(history, AiPrompt.merge(prompt, modelInput)),
                response
              )
            })
          )
        }),
        provideContext,
        semaphore.withPermits(1),
        Effect.withSpan("AiChat.generateObject", {
          attributes: {
            toolCallId: "toolCallId" in options
              ? options.toolCallId
              : "_tag" in options.schema
              ? options.schema._tag
              : (options.schema as any).identifier ?? "generateObject"
          },
          captureStackTrace: false
        })
      ) as any
    }
  })
})

/**
 * Constructs a new `AiChat` with an empty chat history.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const empty: Effect.Effect<Service, never, AiLanguageModel.AiLanguageModel> = fromPrompt(AiPrompt.empty)

const decodeUnknown = Schema.decodeUnknown(AiPrompt.AiPrompt)

/**
 * Constructs a new `AiChat` from previously exported chat history.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromExport = (data: unknown): Effect.Effect<Service, ParseError, AiLanguageModel.AiLanguageModel> =>
  Effect.flatMap(decodeUnknown(data), fromPrompt)

const decodeJson = Schema.decode(AiPrompt.FromJson)

/**
 * Constructs a new `AiChat` from previously exported chat history in JSON format.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromJson = (data: string): Effect.Effect<Service, ParseError, AiLanguageModel.AiLanguageModel> =>
  Effect.flatMap(decodeJson(data), fromPrompt)
