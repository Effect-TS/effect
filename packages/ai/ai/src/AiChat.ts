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
import * as AiResponse from "./AiResponse_old.js"

/**
 * @since 1.0.0
 * @category Context
 */
export class AiChat extends Context.Tag("@effect/ai/AiChat")<
  AiChat,
  AiChat.Service
>() { }

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
      Options extends NoExcessProperties<Omit<AiLanguageModel.GenerateTextOptions<any>, "system">, Options>
    >(options: Options) => Effect.Effect<
      AiResponse.AiResponse,
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
      Options extends NoExcessProperties<Omit<AiLanguageModel.GenerateTextOptions<any>, "system">, Options>
    >(options: Options) => Stream.Stream<
      AiResponse.AiResponse,
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
    readonly generateObject: <A, I, R>(
      options: Omit<
        | AiLanguageModel.GenerateObjectOptions<A, I, R>
        | AiLanguageModel.GenerateObjectWithToolCallIdOptions<A, I, R>,
        "system"
      >
    ) => Effect.Effect<AiResponse.WithStructuredOutput<A>, AiError, R>
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromPrompt = Effect.fnUntraced(
  function*(options: {
    readonly prompt: AiInput.Raw
    readonly system?: string
  }) {
    const languageModel = yield* AiLanguageModel.AiLanguageModel
    const history = yield* Ref.make<AiInput.AiInput>(AiInput.make(options.prompt))
    const semaphore = yield* Effect.makeSemaphore(1)

    return AiChat.of({
      history: Ref.get(history),
      export: Ref.get(history).pipe(
        Effect.flatMap(Schema.encode(AiInput.AiInput)),
        Effect.orDie
      ),
      exportJson: Ref.get(history).pipe(
        Effect.flatMap(Schema.encode(AiInput.AiInputFromJson)),
        Effect.orDie
      ),
      generateText(options) {
        const newParts = AiInput.make(options.prompt)
        return Ref.get(history).pipe(
          Effect.flatMap((parts) => {
            const allParts = [...parts, ...newParts]
            return languageModel.generateText({
              ...options,
              prompt: allParts
            }).pipe(
              Effect.tap((response) => {
                const responseParts = AiInput.make(response)
                return Ref.set(history, [...allParts, ...responseParts])
              })
            )
          }),
          semaphore.withPermits(1),
          Effect.withSpan("AiChat.send", { captureStackTrace: false })
        )
      },
      streamText(options) {
        return Stream.suspend(() => {
          let combined = AiResponse.AiResponse.empty
          return Stream.fromChannel(Channel.acquireUseRelease(
            semaphore.take(1).pipe(
              Effect.zipRight(Ref.get(history)),
              Effect.map((history) => [...history, ...AiInput.make(options.prompt)])
            ),
            (parts) =>
              languageModel.streamText({
                ...options,
                prompt: parts
              }).pipe(
                Stream.map((chunk) => {
                  combined = combined.merge(chunk)
                  return chunk
                }),
                Stream.toChannel
              ),
            (parts) =>
              Effect.zipRight(
                Ref.set(history, [...parts, ...AiInput.make(combined)]),
                semaphore.release(1)
              )
          ))
        }).pipe(Stream.withSpan("AiChat.stream", {
          captureStackTrace: false
        }))
      },
      generateObject(options) {
        const newParts = AiInput.make(options.prompt)
        return Ref.get(history).pipe(
          Effect.flatMap((parts) => {
            const allParts = [...parts, ...newParts]
            return languageModel.generateObject({
              ...options,
              prompt: allParts
            } as any).pipe(
              Effect.flatMap((response) => {
                const responseParts = AiInput.make(response)
                return Effect.as(
                  Ref.set(history, [...allParts, ...responseParts]),
                  response.value
                )
              })
            )
          }),
          semaphore.withPermits(1),
          Effect.withSpan("AiChat.structured", {
            attributes: {
              toolCallId: "toolCallId" in options
                ? options.toolCallId
                : "_tag" in options.schema
                  ? options.schema._tag
                  : (options.schema as any).identifier
            },
            captureStackTrace: false
          })
        ) as any
      }
    })
  }
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Effect.Effect<AiChat.Service, never, AiLanguageModel.AiLanguageModel> = fromPrompt({ prompt: [] })

const decodeUnknown = Schema.decodeUnknown(AiInput.AiInput)

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromExport = (data: unknown): Effect.Effect<AiChat.Service, ParseError, AiLanguageModel.AiLanguageModel> =>
  Effect.flatMap(decodeUnknown(data), (prompt) => fromPrompt({ prompt }))

const decodeJson = Schema.decode(AiInput.AiInputFromJson)

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromJson = (data: string): Effect.Effect<AiChat.Service, ParseError, AiLanguageModel.AiLanguageModel> =>
  Effect.flatMap(decodeJson(data), (prompt) => fromPrompt({ prompt }))
