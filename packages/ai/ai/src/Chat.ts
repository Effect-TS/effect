/**
 * @since 1.0.0
 */
import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import type { ParseError } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type { NoExcessProperties } from "effect/Types"
import * as LanguageModel from "./LanguageModel.js"
import * as Prompt from "./Prompt.js"
import type * as Response from "./Response.js"
import type * as Tool from "./Tool.js"
import type * as Toolkit from "./Toolkit.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class Chat extends Context.Tag("@effect/ai/Chat")<
  Chat,
  Service
>() {}

/**
 * Represents the interface that the `Chat` service provides.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  /**
   * The chat history.
   */
  readonly history: Ref.Ref<Prompt.Prompt>

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
    Tools extends Record<string, Tool.Any>,
    Options extends NoExcessProperties<LanguageModel.GenerateTextOptions<Tools>, Options>
  >(options: Options & LanguageModel.GenerateTextOptions<Tools>) => Effect.Effect<
    LanguageModel.GenerateTextResponse<Tools>,
    LanguageModel.ExtractError<Options>,
    LanguageModel.ExtractContext<Options>
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
    Tools extends Record<string, Tool.Any>,
    Options extends NoExcessProperties<LanguageModel.GenerateTextOptions<Tools>, Options>
  >(options: Options & LanguageModel.GenerateTextOptions<Tools>) => Stream.Stream<
    Response.StreamPart<Tools>,
    LanguageModel.ExtractError<Options>,
    LanguageModel.ExtractContext<Options>
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

  readonly generateObject: <
    Tools extends Record<string, Tool.Any>,
    A,
    I extends Record<string, unknown>,
    R,
    Options extends NoExcessProperties<LanguageModel.GenerateObjectOptions<Tools, A, I, R>, Options>
  >(options: Options & LanguageModel.GenerateObjectOptions<Tools, A, I, R>) => Effect.Effect<
    LanguageModel.GenerateObjectResponse<Tools, A>,
    LanguageModel.ExtractError<Options>,
    LanguageModel.LanguageModel | R | LanguageModel.ExtractContext<Options>
  >
}

/**
 * @since 1.0.0
 * @category Constructors
 */
export const fromPrompt = Effect.fnUntraced(function*(
  prompt: Prompt.RawInput
) {
  const languageModel = yield* LanguageModel.LanguageModel
  const context = yield* Effect.context<never>()
  const provideContext = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.mapInputContext(effect, (input) => Context.merge(context, input))
  const provideContextStream = <A, E, R>(stream: Stream.Stream<A, E, R>): Stream.Stream<A, E, R> =>
    Stream.mapInputContext(stream, (input) => Context.merge(context, input))
  const history = yield* Ref.make<Prompt.Prompt>(Prompt.make(prompt))
  const semaphore = yield* Effect.makeSemaphore(1)

  return Chat.of({
    history,
    export: Ref.get(history).pipe(
      Effect.flatMap(Schema.encode(Prompt.Prompt)),
      Effect.withSpan("Chat.export"),
      Effect.orDie
    ),
    exportJson: Ref.get(history).pipe(
      Effect.flatMap(Schema.encode(Prompt.FromJson)),
      Effect.withSpan("Chat.exportJson"),
      Effect.orDie
    ),
    generateText: Effect.fnUntraced(
      function*(options) {
        const toolkit = Predicate.isNotUndefined(options.toolkit)
          ? yield* resolveToolkit(options.toolkit)
          : undefined

        const newPrompt = Prompt.make(options.prompt)
        const oldPrompt = yield* Ref.get(history)
        const prompt = Prompt.merge(oldPrompt, newPrompt)

        const response = yield* languageModel.generateText({
          ...options,
          toolkit,
          prompt
        })

        const newHistory = Prompt.merge(prompt, Prompt.fromResponseParts(response.content))
        yield* Ref.set(history, newHistory)

        return response
      },
      provideContext,
      semaphore.withPermits(1),
      Effect.withSpan("Chat.generateText", { captureStackTrace: false })
    ),
    streamText: Effect.fnUntraced(
      function*(options) {
        let combined: Prompt.Prompt = Prompt.empty
        return Stream.fromChannel(Channel.acquireUseRelease(
          semaphore.take(1).pipe(
            Effect.zipRight(Ref.get(history)),
            Effect.map((history) => Prompt.merge(history, Prompt.make(options.prompt)))
          ),
          (prompt) =>
            languageModel.streamText({ ...options, prompt }).pipe(
              Stream.mapChunksEffect(Effect.fnUntraced(function*(chunk) {
                const parts = Array.from(chunk)
                combined = Prompt.merge(combined, Prompt.fromResponseParts(parts))
                return chunk
              })),
              Stream.toChannel
            ),
          (parts) =>
            Effect.zipRight(
              Ref.set(history, Prompt.merge(parts, combined)),
              semaphore.release(1)
            )
        )).pipe(
          provideContextStream,
          Stream.withSpan("Chat.streamText", {
            captureStackTrace: false
          })
        )
      },
      Stream.unwrap
    ),
    generateObject: Effect.fnUntraced(
      function*(options) {
        const newPrompt = Prompt.make(options.prompt)
        const oldPrompt = yield* Ref.get(history)
        const prompt = Prompt.merge(oldPrompt, newPrompt)

        const response = yield* languageModel.generateObject({ ...options, prompt })

        const newHistory = Prompt.merge(prompt, Prompt.fromResponseParts(response.content))
        yield* Ref.set(history, newHistory)

        return response
      },
      provideContext,
      semaphore.withPermits(1),
      (effect, options) =>
        Effect.withSpan(effect, "Chat.generateObject", {
          attributes: {
            objectName: "objectName" in options
              ? options.objectName
              : "_tag" in options.schema
              ? options.schema._tag
              : (options.schema as any).identifier ?? "generateObject"
          },
          captureStackTrace: false
        })
    )
  })
})

/**
 * Constructs a new `Chat` with an empty chat history.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const empty: Effect.Effect<Service, never, LanguageModel.LanguageModel> = fromPrompt(Prompt.empty)

const decodeUnknown = Schema.decodeUnknown(Prompt.Prompt)

/**
 * Constructs a new `Chat` from previously exported chat history.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromExport = (data: unknown): Effect.Effect<Service, ParseError, LanguageModel.LanguageModel> =>
  Effect.flatMap(decodeUnknown(data), fromPrompt)

const decodeJson = Schema.decode(Prompt.FromJson)

/**
 * Constructs a new `Chat` from previously exported chat history in JSON format.
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromJson = (data: string): Effect.Effect<Service, ParseError, LanguageModel.LanguageModel> =>
  Effect.flatMap(decodeJson(data), fromPrompt)

// =============================================================================
// Utilities
// =============================================================================

const resolveToolkit = <Tools extends Record<string, Tool.Any>, E, R>(
  toolkit: Toolkit.WithHandler<Tools> | Effect.Effect<Toolkit.WithHandler<Tools>, E, R>
): Effect.Effect<Toolkit.WithHandler<Tools>, E, R> => Effect.isEffect(toolkit) ? toolkit : Effect.succeed(toolkit)
