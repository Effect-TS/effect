/**
 * @since 1.0.0
 */
export * as AiError from "./AiError.js"

/**
 * @since 1.0.0
 */
export * as Chat from "./Chat.js"

/**
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
 *   const idGen = yield* IdGenerator
 *   const toolCallId = yield* idGen.generateId()
 *   console.log(toolCallId) // "id_A7xK9mP2qR5tY8uV"
 *   return toolCallId
 * }).pipe(
 *   Effect.provide(Layer.succeed(IdGenerator, IdGenerator.defaultIdGenerator))
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
 *   const idGen = yield* IdGenerator
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
 * @since 1.0.0
 */
export * as Model from "./Model.js"

/**
 * @since 1.0.0
 */
export * as Prompt from "./Prompt.js"

/**
 * Represents the reason why a model finished generation of a response.
 *
 * Possible finish reasons:
 * - `"stop"`: The model generated a stop sequence.
 * - `"length"`: The model exceeded its token budget.
 * - `"content-filter"`: The model generated content which violated a content filter.
 * - `"tool-calls"`: The model triggered a tool call.
 * - `"error"`: The model encountered an error.
 * - `"other"`: The model stopped for a reason not supported by this protocol.
 * - `"unknown"`: The model did not specify a finish reason.
 *
 * @since 1.0.0
 * @category Models
 */
export * as Response from "./Response.js"

/**
 * @since 1.0.0
 */
export * as Telemetry from "./Telemetry.js"

/**
 * @since 1.0.0
 */
export * as Tokenizer from "./Tokenizer.js"

/**
 * @since 1.0.0
 * @category Type Ids
 */
export * as Tool from "./Tool.js"

/**
 * @since 1.0.0
 */
export * as Toolkit from "./Toolkit.js"
