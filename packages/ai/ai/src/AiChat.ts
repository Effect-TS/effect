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
import * as AiInput from "./AiInput.js"
import * as AiLanguageModel from "./AiLanguageModel.js"
import * as AiResponse from "./AiResponse.js"
import type * as AiTool from "./AiTool.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class AiChat extends Context.Tag("@effect/ai/AiChat")<
  AiChat,
  AiChat.Service
>() {}

/**
 * @since 1.0.0
 * @category Models
 */
export declare namespace AiChat {
  /**
   * @since 1.0.0
   * @category Models
   */
  export interface Service {
    /**
     * The chat history.
     */
    readonly history: Effect.Effect<AiInput.AiInput>

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
      Tools extends AiTool.Any,
      Options extends NoExcessProperties<AiLanguageModel.GenerateTextOptions<any>, Options>
    >(
      options: Options & Omit<AiLanguageModel.GenerateTextOptions<Tools>, "system">
    ) => Effect.Effect<
      AiLanguageModel.ExtractSuccess<Options>,
      AiLanguageModel.ExtractError<Options>,
      AiLanguageModel.ExtractContext<Options>
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
      Tools extends AiTool.Any,
      Options extends NoExcessProperties<AiLanguageModel.GenerateTextOptions<any>, Options>
    >(
      options: Options & Omit<AiLanguageModel.GenerateTextOptions<Tools>, "system">
    ) => Stream.Stream<
      AiLanguageModel.ExtractSuccess<Options>,
      AiLanguageModel.ExtractError<Options>,
      AiLanguageModel.ExtractContext<Options>
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
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromPrompt = Effect.fnUntraced(function*(options: {
  readonly prompt: AiInput.Raw
  readonly system?: string
}) {
  const languageModel = yield* AiLanguageModel.AiLanguageModel
  const context = yield* Effect.context<never>()
  const provideContext = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.mapInputContext(effect, (input) => Context.merge(context, input))
  const provideContextStream = <A, E, R>(stream: Stream.Stream<A, E, R>): Stream.Stream<A, E, R> =>
    Stream.mapInputContext(stream, (input) => Context.merge(context, input))
  const history = yield* Ref.make<AiInput.AiInput>(AiInput.make(options.prompt))
  const semaphore = yield* Effect.makeSemaphore(1)
  const system = options.system

  return AiChat.of({
    history: Ref.get(history),
    export: Ref.get(history).pipe(
      Effect.flatMap(Schema.encode(AiInput.AiInput)),
      Effect.orDie
    ),
    exportJson: Ref.get(history).pipe(
      Effect.flatMap(Schema.encode(AiInput.FromJson)),
      Effect.orDie
    ),
    generateText(options) {
      const newInput = AiInput.make(options.prompt)
      return Ref.get(history).pipe(
        Effect.flatMap((oldInput) => {
          const input = AiInput.concat(oldInput, newInput)
          return languageModel.generateText({
            ...options,
            system,
            prompt: input
          }).pipe(
            Effect.tap((response) => {
              const modelInput = AiInput.make(response)
              return Ref.set(history, AiInput.concat(input, modelInput))
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
            Effect.map((history) => AiInput.concat(history, AiInput.make(options.prompt)))
          ),
          (parts) =>
            languageModel.streamText({
              ...options,
              system,
              prompt: parts
            }).pipe(
              Stream.map((chunk) => {
                combined = AiResponse.merge(combined, chunk)
                return chunk
              }),
              Stream.toChannel
            ),
          (parts) =>
            Effect.zipRight(
              Ref.set(history, AiInput.concat(parts, AiInput.make(combined))),
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
      const newInput = AiInput.make(options.prompt)
      return Ref.get(history).pipe(
        Effect.flatMap((oldInput) => {
          const input = AiInput.concat(oldInput, newInput)
          return languageModel.generateObject({
            ...options,
            system,
            prompt: input
          } as any).pipe(
            Effect.flatMap((response) => {
              const modelInput = AiInput.make(response)
              return Effect.as(
                Ref.set(history, AiInput.concat(input, modelInput)),
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
 * @since 1.0.0
 * @category Constructors
 */
export const empty: Effect.Effect<AiChat.Service, never, AiLanguageModel.AiLanguageModel> = fromPrompt({ prompt: [] })

const decodeUnknown = Schema.decodeUnknown(AiInput.AiInput)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromExport = (data: unknown): Effect.Effect<AiChat.Service, ParseError, AiLanguageModel.AiLanguageModel> =>
  Effect.flatMap(decodeUnknown(data), (prompt) => fromPrompt({ prompt }))

const decodeJson = Schema.decode(AiInput.FromJson)

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromJson = (data: string): Effect.Effect<AiChat.Service, ParseError, AiLanguageModel.AiLanguageModel> =>
  Effect.flatMap(decodeJson(data), (prompt) => fromPrompt({ prompt }))
