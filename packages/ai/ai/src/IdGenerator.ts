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
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Predicate from "effect/Predicate"
import * as Random from "effect/Random"

/**
 * The `IdGenerator` service tag for dependency injection.
 *
 * This tag is used to provide and access ID generation functionality throughout
 * the application. It follows Effect's standard service pattern for type-safe
 * dependency injection.
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const useIdGenerator = Effect.gen(function* () {
 *   const idGenerator = yield* IdGenerator
 *   const newId = yield* idGenerator.generateId()
 *   return newId
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export class IdGenerator extends Context.Tag("@effect/ai/IdGenerator")<
  IdGenerator,
  Service
>() {}

/**
 * The service interface for ID generation.
 *
 * Defines the contract that all ID generator implementations must fulfill.
 * The service provides a single method for generating unique identifiers
 * in an effectful context.
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // Custom implementation
 * const customService: IdGenerator.Service = {
 *   generateId: () => Effect.succeed(`custom_${Date.now()}`)
 * }
 *
 * const program = Effect.gen(function* () {
 *   const id = yield* customService.generateId()
 *   console.log(id) // "custom_1234567890"
 *   return id
 * })
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface Service {
  readonly generateId: () => Effect.Effect<string>
}

/**
 * Configuration options for creating custom ID generators.
 *
 * @param alphabet - The character set to use for generating the random portion of IDs
 * @param prefix - Optional prefix to prepend to generated IDs
 * @param separator - Character used to separate the prefix from the random portion
 * @param size - Length of the random portion of the generated ID
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 *
 * // Configuration for tool call IDs
 * const toolCallOptions: IdGenerator.MakeOptions = {
 *   alphabet: "0123456789ABCDEF",
 *   prefix: "tool",
 *   separator: "_",
 *   size: 8
 * }
 *
 * // This will generate IDs like: "tool_A1B2C3D4"
 * ```
 *
 * @since 1.0.0
 * @category Models
 */
export interface MakeOptions {
  readonly alphabet: string
  readonly prefix?: string | undefined
  readonly separator: string
  readonly size: number
}

const DEFAULT_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const DEFAULT_SEPARATOR = "_"
const DEFAULT_SIZE = 16

const makeGenerator = ({
  alphabet = DEFAULT_ALPHABET,
  prefix,
  separator = DEFAULT_SEPARATOR,
  size = DEFAULT_SIZE
}: Partial<MakeOptions>) => {
  const alphabetLength = alphabet.length
  return Effect.fnUntraced(function*() {
    const chars = new Array(size)
    for (let i = 0; i < size; i++) {
      chars[i] = alphabet[((yield* Random.next) * alphabetLength) | 0]
    }
    const identifier = chars.join("")
    if (Predicate.isUndefined(prefix)) {
      return identifier
    }
    return `${prefix}${separator}${identifier}`
  })
}

/**
 * Default ID generator service implementation.
 *
 * Uses the standard configuration with "id" prefix and generates IDs in the format
 * "id_XXXXXXXXXXXXXXXX" where X represents random alphanumeric characters.
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect, Layer } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   const id = yield* IdGenerator.defaultIdGenerator.generateId()
 *   console.log(id) // "id_A7xK9mP2qR5tY8uV"
 *   return id
 * })
 *
 * // Or provide as a layer
 * const withDefault = program.pipe(
 *   Effect.provide(Layer.succeed(IdGenerator, IdGenerator.defaultIdGenerator))
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const defaultIdGenerator: Service = {
  generateId: makeGenerator({ prefix: "id" })
}

/**
 * Creates a custom ID generator service with the specified options.
 *
 * Validates the configuration to ensure the separator is not part of the alphabet,
 * which would cause ambiguity in parsing generated IDs.
 *
 * @param options - Configuration options for the ID generator
 * @returns Effect that yields a configured Service or fails with IllegalArgumentException
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * const program = Effect.gen(function* () {
 *   // Create a generator for AI assistant message IDs
 *   const messageIdGen = yield* IdGenerator.make({
 *     alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
 *     prefix: "msg",
 *     separator: "-",
 *     size: 10
 *   })
 *
 *   const messageId = yield* messageIdGen.generateId()
 *   console.log(messageId) // "msg-A7X9K2M5P8"
 *   return messageId
 * })
 * ```
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect } from "effect"
 *
 * // This will fail with IllegalArgumentException
 * const invalidConfig = IdGenerator.make({
 *   alphabet: "ABC123",
 *   prefix: "test",
 *   separator: "A", // Error: separator is part of alphabet
 *   size: 8
 * })
 *
 * const program = Effect.gen(function* () {
 *   const generator = yield* invalidConfig
 *   return generator
 * }).pipe(
 *   Effect.catchAll(error =>
 *     Effect.succeed(`Configuration error: ${error.message}`)
 *   )
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const make = Effect.fnUntraced(function*({
  alphabet = DEFAULT_ALPHABET,
  prefix,
  separator = DEFAULT_SEPARATOR,
  size = DEFAULT_SIZE
}: MakeOptions) {
  if (alphabet.includes(separator)) {
    const message = `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
    return yield* new Cause.IllegalArgumentException(message)
  }

  const generateId = makeGenerator({ alphabet, prefix, separator, size })

  return {
    generateId
  } as const
})

/**
 * Creates a Layer that provides the IdGenerator service with custom configuration.
 *
 * This is the recommended way to provide ID generation capabilities to your application.
 * The layer will fail during construction if the configuration is invalid.
 *
 * @param options - Configuration options for the ID generator
 * @returns Layer that provides IdGenerator service or fails with IllegalArgumentException
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect, Layer } from "effect"
 *
 * // Create a layer for generating AI tool call IDs
 * const toolCallIdLayer = IdGenerator.layer({
 *   alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
 *   prefix: "tool_call",
 *   separator: "_",
 *   size: 12
 * })
 *
 * const program = Effect.gen(function* () {
 *   const idGen = yield* IdGenerator
 *   const toolCallId = yield* idGen.generateId()
 *   console.log(toolCallId) // "tool_call_A7XK9MP2QR5T"
 *   return toolCallId
 * }).pipe(
 *   Effect.provide(toolCallIdLayer)
 * )
 * ```
 *
 * @example
 * ```ts
 * import { IdGenerator } from "@effect/ai"
 * import { Effect, Layer, Console } from "effect"
 *
 * // Multiple ID generators in the same app
 * const userIdLayer = IdGenerator.layer({
 *   alphabet: "0123456789",
 *   prefix: "user",
 *   separator: "_",
 *   size: 8
 * })
 *
 * const sessionIdLayer = IdGenerator.layer({
 *   alphabet: "0123456789ABCDEF",
 *   prefix: "session",
 *   separator: "-",
 *   size: 16
 * })
 *
 * const program = Effect.gen(function* () {
 *   const idGen = yield* IdGenerator
 *   const userId = yield* idGen.generateId()
 *   yield* Console.log(`Generated user ID: ${userId}`)
 *   return userId
 * }).pipe(
 *   Effect.provide(userIdLayer)
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const layer = (options: MakeOptions): Layer.Layer<IdGenerator, Cause.IllegalArgumentException> =>
  Layer.effect(IdGenerator, make(options))
