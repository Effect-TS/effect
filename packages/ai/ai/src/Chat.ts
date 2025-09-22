/**
 * The `Chat` module provides a stateful conversation interface for AI language
 * models.
 *
 * This module enables persistent chat sessions that maintain conversation
 * history, support tool calling, and offer both streaming and non-streaming
 * text generation. It integrates seamlessly with the Effect AI ecosystem,
 * providing type-safe conversational AI capabilities.
 *
 * @example
 * ```ts
 * import { Chat, LanguageModel } from "@effect/ai"
 * import { Effect, Layer } from "effect"
 *
 * // Create a new chat session
 * const program = Effect.gen(function* () {
 *   const chat = yield* Chat.empty
 *
 *   // Send a message and get response
 *   const response = yield* chat.generateText({
 *     prompt: "Hello! What can you help me with?"
 *   })
 *
 *   console.log(response.content)
 *
 *   return response
 * })
 * ```
 *
 * @example
 * ```ts
 * import { Chat, LanguageModel } from "@effect/ai"
 * import { Effect, Stream } from "effect"
 *
 * // Streaming chat with tool support
 * const streamingChat = Effect.gen(function* () {
 *   const chat = yield* Chat.empty
 *
 *   yield* chat.streamText({
 *     prompt: "Generate a creative story"
 *   }).pipe(Stream.runForEach((part) =>
 *     Effect.sync(() => console.log(part))
 *   ))
 * })
 * ```
 *
 * @since 1.0.0
 */
import * as Persistence from "@effect/experimental/Persistence"
import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type { ParseError } from "effect/ParseResult"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type { NoExcessProperties } from "effect/Types"
import * as IdGenerator from "./IdGenerator.js"
import * as LanguageModel from "./LanguageModel.js"
import * as Prompt from "./Prompt.js"
import type * as Response from "./Response.js"
import type * as Tool from "./Tool.js"

/**
 * The `Chat` service tag for dependency injection.
 *
 * This tag provides access to chat functionality throughout your application,
 * enabling persistent conversational AI interactions with full context
 * management.
 *
 * @example
 * ```ts
 * import { Chat } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const useChat = Effect.gen(function* () {
 *   const chat = yield* Chat
 *   const response = yield* chat.generateText({
 *     prompt: "Explain quantum computing in simple terms"
 *   })
 *   return response.content
 * })
 * ```
 *
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
   * Reference to the chat history.
   *
   * Provides direct access to the conversation history for advanced use cases
   * like custom history manipulation or inspection.
   *
   * @example
   * ```ts
   * import { Chat } from "@effect/ai"
   * import { Effect, Ref } from "effect"
   *
   * const inspectHistory = Effect.gen(function* () {
   *   const chat = yield* Chat.empty
   *   const currentHistory = yield* Ref.get(chat.history)
   *   console.log("Current conversation:", currentHistory)
   *   return currentHistory
   * })
   * ```
   */
  readonly history: Ref.Ref<History>

  /**
   * Exports the chat history into a structured format.
   *
   * Returns the complete conversation history as a structured object
   * that can be stored, transmitted, or processed by other systems.
   *
   * @example
   * ```ts
   * import { Chat } from "@effect/ai"
   * import { Effect } from "effect"
   *
   * const saveChat = Effect.gen(function* () {
   *   const chat = yield* Chat.empty
   *   yield* chat.generateText({ prompt: "Hello!" })
   *
   *   const exportedData = yield* chat.export
   *
   *   // Save to database or file system
   *   return exportedData
   * })
   * ```
   */
  readonly export: Effect.Effect<unknown>

  /**
   * Exports the chat history as a JSON string.
   *
   * Provides a convenient way to serialize the entire conversation
   * for storage or transmission in JSON format.
   *
   * @example
   * ```ts
   * import { Chat } from "@effect/ai"
   * import { Effect } from "effect"
   *
   * const backupChat = Effect.gen(function* () {
   *   const chat = yield* Chat.empty
   *   yield* chat.generateText({ prompt: "Explain photosynthesis" })
   *
   *   const jsonBackup = yield* chat.exportJson
   *
   *   yield* Effect.sync(() =>
   *     localStorage.setItem("chat-backup", jsonBackup)
   *   )
   *
   *   return jsonBackup
   * })
   * ```
   */
  readonly exportJson: Effect.Effect<string>

  /**
   * Generate text using a language model for the specified prompt.
   *
   * If a toolkit is specified, the language model will have access to tools
   * for function calling and enhanced capabilities. Both input and output
   * messages are automatically added to the chat history.
   *
   * @example
   * ```ts
   * import { Chat } from "@effect/ai"
   * import { Effect } from "effect"
   *
   * const chatWithAI = Effect.gen(function* () {
   *   const chat = yield* Chat.empty
   *
   *   const response1 = yield* chat.generateText({
   *     prompt: "What is the capital of France?"
   *   })
   *
   *   const response2 = yield* chat.generateText({
   *     prompt: "What's the population of that city?",
   *   })
   *
   *   return [response1.content, response2.content]
   * })
   * ```
   */
  readonly generateText: <
    Options extends NoExcessProperties<LanguageModel.GenerateTextOptions<any>, Options>,
    Tools extends Record<string, Tool.Any> = {}
  >(options: Options & LanguageModel.GenerateTextOptions<Tools>) => Effect.Effect<
    LanguageModel.GenerateTextResponse<Tools>,
    LanguageModel.ExtractError<Options>,
    LanguageModel.ExtractContext<Options>
  >

  /**
   * Generate text using a language model with streaming output.
   *
   * Returns a stream of response parts that are emitted as soon as they're
   * available from the model. Supports tool calling and maintains chat history.
   *
   * @example
   * ```ts
   * import { Chat } from "@effect/ai"
   * import { Effect, Stream, Console } from "effect"
   *
   * const streamingChat = Effect.gen(function* () {
   *   const chat = yield* Chat.empty
   *
   *   const stream = yield* chat.streamText({
   *     prompt: "Write a short story about space exploration"
   *   })
   *
   *   yield* Stream.runForEach(stream, (part) =>
   *     part.type === "text-delta"
   *       ? Effect.sync(() => process.stdout.write(part.delta))
   *       : Effect.void
   *   )
   * })
   * ```
   */
  readonly streamText: <
    Options extends NoExcessProperties<LanguageModel.GenerateTextOptions<any>, Options>,
    Tools extends Record<string, Tool.Any> = {}
  >(options: Options & LanguageModel.GenerateTextOptions<Tools>) => Stream.Stream<
    Response.StreamPart<Tools>,
    LanguageModel.ExtractError<Options>,
    LanguageModel.ExtractContext<Options>
  >

  /**
   * Generate a structured object using a language model and schema.
   *
   * Forces the model to return data that conforms to the specified schema,
   * enabling structured data extraction and type-safe responses. The
   * conversation history is maintained across calls.
   *
   * @example
   * ```ts
   * import { Chat } from "@effect/ai"
   * import { Effect, Schema } from "effect"
   *
   * const ContactSchema = Schema.Struct({
   *   name: Schema.String,
   *   email: Schema.String,
   *   phone: Schema.optional(Schema.String)
   * })
   *
   * const extractContact = Effect.gen(function* () {
   *   const chat = yield* Chat.empty
   *
   *   const contact = yield* chat.generateObject({
   *     prompt: "Extract contact info: John Doe, john@example.com, 555-1234",
   *     schema: ContactSchema
   *   })
   *
   *   console.log(contact.object)
   *   // { name: "John Doe", email: "john@example.com", phone: "555-1234" }
   *
   *   return contact.object
   * })
   * ```
   */
  readonly generateObject: <
    A,
    I extends Record<string, unknown>,
    R,
    Options extends NoExcessProperties<LanguageModel.GenerateObjectOptions<any, A, I, R>, Options>,
    Tools extends Record<string, Tool.Any> = {}
  >(options: Options & LanguageModel.GenerateObjectOptions<Tools, A, I, R>) => Effect.Effect<
    LanguageModel.GenerateObjectResponse<Tools, A>,
    LanguageModel.ExtractError<Options>,
    LanguageModel.LanguageModel | R | LanguageModel.ExtractContext<Options>
  >
}

// =============================================================================
// Chat History
// =============================================================================

const constEmptyObject = () => ({})

export class SystemMessage extends Schema.Class<SystemMessage>("@effect/ai/Chat/SystemMessage")({
  id: Schema.optional(Schema.String),
  role: Schema.tag("system"),
  text: Schema.String,
  options: Schema.optionalWith(Prompt.ProviderOptions, { default: constEmptyObject })
}) {}

export class UserMessage extends Schema.Class<UserMessage>("@effect/ai/Chat/UserMessage")({
  id: Schema.optional(Schema.String),
  role: Schema.tag("user"),
  parts: Schema.Array(Schema.encodedSchema(Schema.Union(Prompt.TextPart, Prompt.FilePart))),
  options: Schema.optionalWith(Prompt.ProviderOptions, { default: constEmptyObject })
}) {}

export class AssistantMessage extends Schema.Class<AssistantMessage>("@effect/ai/Chat/AssistantMessage")({
  id: Schema.optional(Schema.String),
  role: Schema.tag("assistant"),
  parts: Schema.Array(Schema.encodedSchema(Schema.Union(
    Prompt.TextPart,
    Prompt.FilePart,
    Prompt.ReasoningPart,
    Prompt.ToolCallPart,
    Prompt.ToolResultPart
  ))),
  options: Schema.optionalWith(Prompt.ProviderOptions, { default: constEmptyObject })
}) {}

export const ChatMessage: Schema.Union<[
  typeof SystemMessage,
  typeof UserMessage,
  typeof AssistantMessage
]> = Schema.Union(
  SystemMessage,
  UserMessage,
  AssistantMessage
)

export type ChatMessage = typeof ChatMessage.Type

export class History extends Schema.Class<History>("@effect/ai/Chat/History")({
  messages: Schema.Array(ChatMessage)
}) {
  static FromJson = Schema.parseJson(History)

  static empty = new History({ messages: [] })

  static fromPrompt(prompt: Prompt.Prompt): Effect.Effect<History> {
    return Effect.gen(this, function*() {
      const idGenerator = yield* Effect.serviceOption(IdGenerator.IdGenerator)

      const messages: Array<ChatMessage> = []
      for (const message of prompt.content) {
        switch (message.role) {
          case "system": {
            messages.push(
              new SystemMessage({
                text: message.content,
                options: message.options
              })
            )
            break
          }
          case "user": {
            messages.push(
              new UserMessage({
                parts: message.content,
                options: message.options
              })
            )
            break
          }
          case "assistant": {
            messages.push(
              new AssistantMessage({
                parts: message.content,
                options: message.options
              })
            )
            break
          }
          case "tool": {
            break
          }
        }
      }

      return new History({ messages })
    })
  }

  static fromResponse(response: ReadonlyArray<Response.AnyPart>): Effect.Effect<History> {
  }

  static encode = Schema.encodeUnknown(History)

  static encodeJson = Schema.encodeUnknown(History.FromJson)

  static decode = Schema.encodeUnknown(History)

  static decodeJson = Schema.decodeUnknown(History.FromJson)

  get toPrompt(): Prompt.Prompt {
    const parts: Array<Prompt.MessageEncoded> = []
    for (const message of this.messages) {
      switch (message.role) {
        case "system": {
          parts.push({
            role: "system",
            content: message.text,
            options: message.options
          })
          break
        }
        case "user": {
          parts.push({
            role: "user",
            content: message.parts,
            options: message.options
          })
          break
        }
        case "assistant": {
          parts.push({
            role: "assistant",
            content: message.parts,
            options: message.options
          })
          break
        }
      }
    }
    return Prompt.make(parts)
  }
}

// =============================================================================
// Constructors
// =============================================================================

const fromHistory = Effect.fnUntraced(
  function*(history: Ref.Ref<History>) {
    const languageModel = yield* LanguageModel.LanguageModel

    const context = yield* Effect.context<never>()
    const semaphore = yield* Effect.makeSemaphore(1)

    const provideContext = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
      Effect.mapInputContext(effect, (input) => Context.merge(context, input))
    const provideContextStream = <A, E, R>(stream: Stream.Stream<A, E, R>): Stream.Stream<A, E, R> =>
      Stream.mapInputContext(stream, (input) => Context.merge(context, input))

    return Chat.of({
      history,
      export: Ref.get(history).pipe(
        Effect.flatMap(History.encode),
        Effect.withSpan("Chat.export"),
        Effect.orDie
      ),
      exportJson: Ref.get(history).pipe(
        Effect.flatMap(History.encodeJson),
        Effect.withSpan("Chat.exportJson"),
        Effect.orDie
      ),
      generateText: Effect.fnUntraced(
        function*(options) {
          const newPrompt = Prompt.make(options.prompt)
          const oldPrompt = yield* Ref.get(history).pipe(
            Effect.map((history) => history.toPrompt)
          )
          const prompt = Prompt.merge(oldPrompt, newPrompt)

          const response = yield* languageModel.generateText({ ...options, prompt })

          const newHistory = Prompt.merge(prompt, Prompt.fromResponseParts(response.content))
          yield* Ref.set(history, yield* History.fromPrompt(newHistory))

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
  }
)

/**
 * Creates a new Chat service from an initial prompt.
 *
 * This is the primary constructor for creating chat instances. It initializes
 * a new conversation with the provided prompt as the starting context.
 *
 * @example
 * ```ts
 * import { Chat, Prompt } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const chatWithSystemPrompt = Effect.gen(function* () {
 *   const chat = yield* Chat.fromPrompt([{
 *     role: "system",
 *     content: "You are a helpful assistant specialized in mathematics."
 *   }])
 *
 *   const response = yield* chat.generateText({
 *     prompt: "What is 2+2?"
 *   })
 *
 *   return response.content
 * })
 * ```
 *
 * @example
 * ```ts
 * import { Chat, Prompt } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // Initialize with conversation history
 * const existingChat = Effect.gen(function* () {
 *   const chat = yield* Chat.fromPrompt([
 *     { role: "user", content: [{ type: "text", text: "What's the weather like?" }] },
 *     { role: "assistant", content: [{ type: "text", text: "I don't have access to weather data." }] },
 *     { role: "user", content: [{ type: "text", text: "Can you help me with coding?" }] }
 *   ])
 *
 *   const response = yield* chat.generateText({
 *     prompt: "I need help with TypeScript"
 *   })
 *
 *   return response
 * })
 * ```
 *
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
        const newPrompt = Prompt.make(options.prompt)
        const oldPrompt = yield* Ref.get(history)
        const prompt = Prompt.merge(oldPrompt, newPrompt)

        const response = yield* languageModel.generateText({ ...options, prompt })

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
 * Creates a new Chat service with empty conversation history.
 *
 * This is the most common way to start a fresh chat session without
 * any initial context or system prompts.
 *
 * @example
 * ```ts
 * import { Chat } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const freshChat = Effect.gen(function* () {
 *   const chat = yield* Chat.empty
 *
 *   const response = yield* chat.generateText({
 *     prompt: "Hello! Can you introduce yourself?"
 *   })
 *
 *   console.log(response.content)
 *
 *   return chat
 * })
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const empty: Effect.Effect<Service, never, LanguageModel.LanguageModel> = fromPrompt(Prompt.empty)

const decodeUnknown = Schema.decodeUnknown(Prompt.Prompt)

/**
 * Creates a Chat service from previously exported chat data.
 *
 * Restores a chat session from structured data that was previously exported
 * using the `export` method. Useful for persisting and restoring conversation
 * state.
 *
 * @example
 * ```ts
 * import { Chat } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * declare const loadFromDatabase: (sessionId: string) => Effect.Effect<unknown>
 *
 * const restoreChat = Effect.gen(function* () {
 *   // Assume we have previously exported data
 *   const savedData = yield* loadFromDatabase("chat-session-123")
 *
 *   const restoredChat = yield* Chat.fromExport(savedData)
 *
 *   // Continue the conversation from where it left off
 *   const response = yield* restoredChat.generateText({
 *     prompt: "Let's continue our discussion"
 *   })
 * }).pipe(
 *   Effect.catchTag("ParseError", (error) => {
 *     console.log("Failed to restore chat:", error.message)
 *     return Effect.void
 *   })
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromExport = (data: unknown): Effect.Effect<Service, ParseError, LanguageModel.LanguageModel> =>
  Effect.flatMap(decodeUnknown(data), fromPrompt)

const decodeJson = Schema.decode(Prompt.FromJson)

/**
 * Creates a Chat service from previously exported JSON chat data.
 *
 * Restores a chat session from JSON string that was previously exported
 * using the `exportJson` method. This is the most convenient way to
 * persist and restore chat sessions to/from storage systems.
 *
 * @example
 * ```ts
 * import { Chat } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const restoreFromJson = Effect.gen(function* () {
 *   // Load JSON from localStorage or file system
 *   const jsonData = localStorage.getItem("my-chat-backup")
 *   if (!jsonData) return yield* Chat.empty
 *
 *   const restoredChat = yield* Chat.fromJson(jsonData)
 *
 *   // Chat history is now restored
 *   const response = yield* restoredChat.generateText({
 *     prompt: "What were we talking about?"
 *   })
 *
 *   return response
 * }).pipe(
 *   Effect.catchTag("ParseError", (error) => {
 *     console.log("Invalid JSON format:", error.message)
 *     return Chat.empty // Fallback to empty chat
 *   })
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const fromJson = (data: string): Effect.Effect<Service, ParseError, LanguageModel.LanguageModel> =>
  Effect.flatMap(decodeJson(data), fromPrompt)

/*
//
// User has not setup Persistence (defaults to in-memory)
//
Effect.gen(function* () {
  const chat = yield* Chat.empty

  // Automatically persist to memory
  yield* chat.streamText({ ... })
})

//
// User has setup Persistence (uses the BackingPersistence layer the user has set up)
//
Effect.gen(function* () {
  const chat = yield* Chat.fromPersistence({ storeId: "..." })
  chat.load(id)

  // Automatically persist to the persistence layer
  yield* chat.streamText({ ... })
})
*/

export class ChatNotFoundError extends Schema.TaggedError<ChatNotFoundError>(
  "@effect/ai/Chat/ChatNotFoundError"
)("ChatNotFoundError", { chatId: Schema.String }) {}

// @effect-diagnostics effect/leakingRequirements:off
export class Persisted extends Context.Tag("@effect/ai/Chat/Persisted")<
  Persisted,
  PersistedService
>() {}

export interface PersistedService {
  readonly get: (chatId: string) => Effect.Effect<Service, ChatNotFoundError, LanguageModel.LanguageModel>
  readonly getOrCreate: (chatId: string) => Effect.Effect<Service, never, LanguageModel.LanguageModel>
}

export const makePersisted = Effect.fnUntraced(function*(options: {
  readonly storeId: string
}) {
  const persistence = yield* Persistence.BackingPersistence
  const store = yield* persistence.make(options.storeId)

  const getInternal = Effect.fnUntraced(
    function*(chatId: string, options?: {
      readonly createIfNotExists?: boolean | undefined
    }) {
      const history = yield* store.get(chatId).pipe(
        Effect.flatMap(Effect.transposeMapOption((json) => History.decodeJson(json))),
        Effect.orDie,
        Effect.flatten,
        Effect.catchTag("NoSuchElementException", () =>
          options?.createIfNotExists === true
            ? store.set(chatId, "", Option.none()).pipe(
              Effect.orDie,
              Effect.as(History.empty)
            )
            : new ChatNotFoundError({ chatId }))
      )

      const ref = yield* Ref.make(history)
      const chat = yield* fromHistory(ref)

      const saveChat = Ref.get(ref).pipe(
        Effect.flatMap(History.encodeJson),
        Effect.flatMap((history) => store.set(chatId, history, Option.none())),
        Effect.orDie // TODO
      )

      return Chat.of({
        ...chat,
        generateText: (options) =>
          chat.generateText(options).pipe(
            Effect.ensuring(saveChat)
          ),
        generateObject: (options) =>
          chat.generateObject(options).pipe(
            Effect.ensuring(saveChat)
          ),
        streamText: (options) =>
          chat.streamText(options).pipe(
            Stream.ensuring(saveChat)
          )
      })
    }
  )

  const get = Effect.fn("PersistedChat.get")(function*(chatId: string) {
    return yield* getInternal(chatId)
  })

  const getOrCreate = Effect.fn("PersistedChat.getOrCreate")(function*(chatId: string) {
    return yield* Effect.orDie(getInternal(chatId, { createIfNotExists: true }))
  })

  return Persisted.of({
    get,
    getOrCreate
  })
})

export const layerPersisted = (options: {
  readonly storeId: string
}): Layer.Layer<Persisted, never, Persistence.BackingPersistence> =>
  Layer.scoped(
    Persisted,
    makePersisted(options)
  )
