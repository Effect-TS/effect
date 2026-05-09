/**
 * The `AiError` module provides comprehensive error handling for AI operations.
 *
 * This module defines a hierarchy of error types that can occur when working
 * with AI services, including HTTP request/response errors, input/output
 * validation errors, and general runtime errors. All errors follow Effect's
 * structured error patterns and provide detailed context for debugging.
 *
 * ## Error Types
 *
 * - **HttpRequestError**: Errors occurring during HTTP request processing
 * - **HttpResponseError**: Errors occurring during HTTP response processing
 * - **MalformedInput**: Errors when input data doesn't match expected format
 * - **MalformedOutput**: Errors when output data can't be parsed or validated
 * - **UnknownError**: Catch-all for unexpected runtime errors
 *
 * @example
 * ```ts
 * import { AiError } from "@effect/ai"
 * import { Effect, Match } from "effect"
 *
 * const handleAiError = Match.type<AiError.AiError>().pipe(
 *   Match.tag("HttpRequestError", (err) =>
 *     Effect.logError(`Request failed: ${err.message}`)
 *   ),
 *   Match.tag("HttpResponseError", (err) =>
 *     Effect.logError(`Response error (${err.response.status}): ${err.message}`)
 *   ),
 *   Match.tag("MalformedInput", (err) =>
 *     Effect.logError(`Invalid input: ${err.message}`)
 *   ),
 *   Match.tag("MalformedOutput", (err) =>
 *     Effect.logError(`Invalid output: ${err.message}`)
 *   ),
 *   Match.orElse((err) =>
 *     Effect.logError(`Unknown error: ${err.message}`)
 *   )
 * )
 * ```
 *
 * @example
 * ```ts
 * import { AiError } from "@effect/ai"
 * import { Effect, Option } from "effect"
 *
 * const aiOperation = Effect.gen(function* () {
 *   // Some AI operation that might fail
 *   return yield* new AiError.HttpRequestError({
 *     module: "OpenAI",
 *     method: "completion",
 *     reason: "Transport",
 *     request: {
 *       method: "POST",
 *       url: "https://api.openai.com/v1/completions",
 *       urlParams: [],
 *       hash: Option.none(),
 *       headers: { "Content-Type": "application/json" }
 *     }
 *   })
 * })
 *
 * const program = aiOperation.pipe(
 *   Effect.catchTag("HttpRequestError", (error) => {
 *     console.log("Request failed:", error.message)
 *     return Effect.succeed("fallback response")
 *   })
 * )
 * ```
 *
 * @since 1.0.0
 */
export * as AiError from "./AiError.js"

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
export * as Chat from "./Chat.js"

/**
 * The `EmbeddingModel` module provides vector embeddings for text using AI
 * models.
 *
 * This module enables efficient conversion of text into high-dimensional vector
 * representations that capture semantic meaning. It supports batching, caching,
 * and request optimization for production use cases like semantic search,
 * document similarity, and clustering.
 *
 * @example
 * ```ts
 * import { EmbeddingModel } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // Basic embedding usage
 * const program = Effect.gen(function* () {
 *   const embedding = yield* EmbeddingModel.EmbeddingModel
 *
 *   const vector = yield* embedding.embed("Hello world!")
 *   console.log(vector) // [0.123, -0.456, 0.789, ...]
 *
 *   return vector
 * })
 * ```
 *
 * @example
 * ```ts
 * import { EmbeddingModel } from "@effect/ai"
 * import { Effect, Duration } from "effect"
 *
 * declare const generateVectorFor: (text: string) => Array<number>
 *
 * // Create embedding service with batching and caching
 * const embeddingService = EmbeddingModel.make({
 *   embedMany: (texts) => Effect.succeed(
 *     texts.map((text, index) => ({
 *       index,
 *       embeddings: generateVectorFor(text)
 *     }))
 *   ),
 *   maxBatchSize: 50,
 *   cache: {
 *     capacity: 1000,
 *     timeToLive: Duration.minutes(30)
 *   }
 * })
 * ```
 *
 * @since 1.0.0
 */
export * as EmbeddingModel from "./EmbeddingModel.js"

/**
 * The `IdGenerator` module provides a pluggable system for generating unique identifiers
 * for tool calls and other items in the Effect AI SDKs.
 *
 * This module offers a flexible and configurable approach to ID generation, supporting
 * custom alphabets, prefixes, separators, and sizes.
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect, Layer } from "effect"
 *
 * // Using the default ID generator
 * const program = Effect.gen(function* () {
 *   const idGen = yield* IdGenerator.IdGenerator
 *   const toolCallId = yield* idGen.generateId()
 *   console.log(toolCallId) // "id_A7xK9mP2qR5tY8uV"
 *   return toolCallId
 * }).pipe(
 *   Effect.provide(Layer.succeed(
 *     IdGenerator.IdGenerator,
 *     IdGenerator.defaultIdGenerator
 *   ))
 * )
 * ```
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect, Layer } from "effect"
 *
 * // Creating a custom ID generator for AI tool calls
 * const customLayer = IdGenerator.layer({
 *   alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
 *   prefix: "tool_call",
 *   separator: "-",
 *   size: 12
 * })
 *
 * const program = Effect.gen(function* () {
 *   const idGen = yield* IdGenerator.IdGenerator
 *   const id = yield* idGen.generateId()
 *   console.log(id) // "tool_call-A7XK9MP2QR5T"
 *   return id
 * }).pipe(
 *   Effect.provide(customLayer)
 * )
 * ```
 *
 * @since 1.0.0
 */
export * as IdGenerator from "./IdGenerator.js"

/**
 * The `LanguageModel` module provides AI text generation capabilities with tool
 * calling support.
 *
 * This module offers a comprehensive interface for interacting with large
 * language models, supporting both streaming and non-streaming text generation,
 * structured output generation, and tool calling functionality. It provides a
 * unified API that can be implemented by different AI providers while
 * maintaining type safety and effect management.
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // Basic text generation
 * const program = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateText({
 *     prompt: "Explain quantum computing"
 *   })
 *
 *   console.log(response.text)
 *
 *   return response
 * })
 * ```
 *
 * @example
 * ```ts
 * import { LanguageModel } from "@effect/ai"
 * import { Effect, Schema } from "effect"
 *
 * // Structured output generation
 * const ContactSchema = Schema.Struct({
 *   name: Schema.String,
 *   email: Schema.String
 * })
 *
 * const extractContact = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateObject({
 *     prompt: "Extract contact: John Doe, john@example.com",
 *     schema: ContactSchema
 *   })
 *
 *   return response.value
 * })
 * ```
 *
 * @since 1.0.0
 */
export * as LanguageModel from "./LanguageModel.js"

/**
 * @since 1.0.0
 */
export * as McpSchema from "./McpSchema.js"

/**
 * @since 1.0.0
 */
export * as McpServer from "./McpServer.js"

/**
 * The `Model` module provides a unified interface for AI service providers.
 *
 * This module enables creation of provider-specific AI models that can be used
 * interchangeably within the Effect AI ecosystem. It combines Layer
 * functionality with provider identification, allowing for seamless switching
 * between different AI service providers while maintaining type safety.
 *
 * @example
 * ```ts
 * import { Model, LanguageModel } from "@effect/ai"
 * import { Effect, Layer } from "effect"
 *
 * declare const myAnthropicLayer: Layer.Layer<LanguageModel.LanguageModel>
 *
 * const anthropicModel = Model.make("anthropic", myAnthropicLayer)
 *
 * const program = Effect.gen(function* () {
 *   const response = yield* LanguageModel.generateText({
 *     prompt: "Hello, world!"
 *   })
 *   return response.text
 * }).pipe(
 *   Effect.provide(anthropicModel)
 * )
 * ```
 *
 * @since 1.0.0
 */
export * as Model from "./Model.js"

/**
 * The `Prompt` module provides several data structures to simplify creating and
 * combining prompts.
 *
 * This module defines the complete structure of a conversation with a large
 * language model, including messages, content parts, and provider-specific
 * options. It supports rich content types like text, files, tool calls, and
 * reasoning.
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * // Create a structured conversation
 * const conversation = Prompt.make([
 *   {
 *     role: "system",
 *     content: "You are a helpful assistant specialized in mathematics."
 *   },
 *   {
 *     role: "user",
 *     content: [{
 *       type: "text",
 *       text: "What is the derivative of x²?"
 *     }]
 *   },
 *   {
 *     role: "assistant",
 *     content: [{
 *       type: "text",
 *       text: "The derivative of x² is 2x."
 *     }]
 *   }
 * ])
 * ```
 *
 * @example
 * ```ts
 * import { Prompt } from "@effect/ai"
 *
 * // Merge multiple prompts
 * const systemPrompt = Prompt.make([{
 *   role: "system",
 *   content: "You are a coding assistant."
 * }])
 *
 * const userPrompt = Prompt.make("Help me write a function")
 *
 * const combined = Prompt.merge(systemPrompt, userPrompt)
 * ```
 *
 * @since 1.0.0
 */
export * as Prompt from "./Prompt.js"

/**
 * The `Response` module provides data structures to represent responses from
 * large language models.
 *
 * This module defines the complete structure of AI model responses, including
 * various content parts for text, reasoning, tool calls, files, and metadata,
 * supporting both streaming and non-streaming responses.
 *
 * @example
 * ```ts
 * import { Response } from "@effect/ai"
 *
 * // Create a simple text response part
 * const textResponse = Response.makePart("text", {
 *   text: "The weather is sunny today!"
 * })
 *
 * // Create a tool call response part
 * const toolCallResponse = Response.makePart("tool-call", {
 *   id: "call_123",
 *   name: "get_weather",
 *   params: { city: "San Francisco" },
 *   providerExecuted: false
 * })
 * ```
 *
 * @since 1.0.0
 */
export * as Response from "./Response.js"

/**
 * The `Telemetry` module provides OpenTelemetry integration for operations
 * performed against a large language model provider by defining telemetry
 * attributes and utilities that follow the OpenTelemetry GenAI semantic
 * conventions.
 *
 * @example
 * ```ts
 * import { Telemetry } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // Add telemetry attributes to a span
 * const addTelemetry = Effect.gen(function* () {
 *   const span = yield* Effect.currentSpan
 *
 *   Telemetry.addGenAIAnnotations(span, {
 *     system: "openai",
 *     operation: { name: "chat" },
 *     request: {
 *       model: "gpt-4",
 *       temperature: 0.7,
 *       maxTokens: 1000
 *     },
 *     usage: {
 *       inputTokens: 100,
 *       outputTokens: 50
 *     }
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 */
export * as Telemetry from "./Telemetry.js"

/**
 * The `Tokenizer` module provides tokenization and text truncation capabilities
 * for large language model text processing workflows.
 *
 * This module offers services for converting text into tokens and truncating
 * prompts based on token limits, essential for managing context length
 * constraints in large language models.
 *
 * @example
 * ```ts
 * import { Tokenizer, Prompt } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const tokenizeText = Effect.gen(function* () {
 *   const tokenizer = yield* Tokenizer.Tokenizer
 *   const tokens = yield* tokenizer.tokenize("Hello, world!")
 *   console.log(`Token count: ${tokens.length}`)
 *   return tokens
 * })
 * ```
 *
 * @example
 * ```ts
 * import { Tokenizer, Prompt } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // Truncate a prompt to fit within token limits
 * const truncatePrompt = Effect.gen(function* () {
 *   const tokenizer = yield* Tokenizer.Tokenizer
 *   const longPrompt = "This is a very long prompt..."
 *   const truncated = yield* tokenizer.truncate(longPrompt, 100)
 *   return truncated
 * })
 * ```
 *
 * @since 1.0.0
 */
export * as Tokenizer from "./Tokenizer.js"

/**
 * The `Tool` module provides functionality for defining and managing tools
 * that language models can call to augment their capabilities.
 *
 * This module enables creation of both user-defined and provider-defined tools,
 * with full schema validation, type safety, and handler support. Tools allow
 * AI models to perform actions like searching databases, calling APIs, or
 * executing code within your application context.
 *
 * @example
 * ```ts
 * import { Tool } from "@effect/ai"
 * import { Schema } from "effect"
 *
 * // Define a simple calculator tool
 * const Calculator = Tool.make("Calculator", {
 *   description: "Performs basic arithmetic operations",
 *   parameters: {
 *     operation: Schema.Literal("add", "subtract", "multiply", "divide"),
 *     a: Schema.Number,
 *     b: Schema.Number
 *   },
 *   success: Schema.Number
 * })
 * ```
 *
 * @since 1.0.0
 */
export * as Tool from "./Tool.js"

/**
 * The `Toolkit` module allows for creating and implementing a collection of
 * `Tool`s which can be used to enhance the capabilities of a large language
 * model beyond simple text generation.
 *
 * @example
 * ```ts
 * import { Toolkit, Tool } from "@effect/ai"
 * import { Effect, Schema } from "effect"
 *
 * // Create individual tools
 * const GetCurrentTime = Tool.make("GetCurrentTime", {
 *   description: "Get the current timestamp",
 *   success: Schema.Number
 * })
 *
 * const GetWeather = Tool.make("GetWeather", {
 *   description: "Get weather for a location",
 *   parameters: { location: Schema.String },
 *   success: Schema.Struct({
 *     temperature: Schema.Number,
 *     condition: Schema.String
 *   })
 * })
 *
 * // Create a toolkit with multiple tools
 * const MyToolkit = Toolkit.make(GetCurrentTime, GetWeather)
 *
 * const MyToolkitLayer = MyToolkit.toLayer({
 *   GetCurrentTime: () => Effect.succeed(Date.now()),
 *   GetWeather: ({ location }) => Effect.succeed({
 *     temperature: 72,
 *     condition: "sunny"
 *   })
 * })
 * ```
 *
 * @since 1.0.0
 */
export * as Toolkit from "./Toolkit.js"
