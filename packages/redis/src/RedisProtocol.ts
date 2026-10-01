/**
 * Binary-safe encoding and incremental decoding of RESP2 and RESP3 Redis messages.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as internal from "./internal/protocol.ts"
import { RedisError } from "./RedisError.ts"

/**
 * A text or binary Redis command argument.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Argument = string | Uint8Array

/**
 * A lossless RESP2 or RESP3 reply, including nested errors and pushed messages.
 *
 * **Details**
 *
 * Integer replies preserve precision as `bigint`. Binary fields own their
 * bytes, independent of the parser's input chunks. Attributes retain their
 * metadata and the value that follows them.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Reply =
  | { readonly _tag: "SimpleString"; readonly value: string }
  | { readonly _tag: "BlobString"; readonly value: Uint8Array }
  | { readonly _tag: "Integer"; readonly value: bigint }
  | { readonly _tag: "Double"; readonly value: number }
  | { readonly _tag: "Boolean"; readonly value: boolean }
  | { readonly _tag: "BigNumber"; readonly value: bigint }
  | { readonly _tag: "Null" }
  | { readonly _tag: "Array"; readonly values: ReadonlyArray<Reply> }
  | { readonly _tag: "Map"; readonly entries: ReadonlyArray<readonly [Reply, Reply]> }
  | { readonly _tag: "Set"; readonly values: ReadonlyArray<Reply> }
  | { readonly _tag: "Error"; readonly message: string; readonly code: string }
  | { readonly _tag: "VerbatimString"; readonly format: string; readonly value: Uint8Array }
  | { readonly _tag: "Push"; readonly values: ReadonlyArray<Reply> }
  | {
    readonly _tag: "Attribute"
    readonly entries: ReadonlyArray<readonly [Reply, Reply]>
    readonly value: Reply
  }

/**
 * Limits on the encoded bytes, nesting, and members of a single reply.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface ParserOptions {
  readonly maxFrameSize?: number | undefined
  readonly maxDepth?: number | undefined
  readonly maxAggregateLength?: number | undefined
}

/**
 * An incremental RESP decoder with terminal failures and explicit EOF validation.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Parser {
  /** Returns complete replies and retains any incomplete reply for the next call. */
  readonly push: (chunk: Uint8Array) => Array<Reply>
  /** Validates that the byte stream ends between replies and closes the parser. */
  readonly end: () => void
}

const decoder = new TextDecoder()

/**
 * Encodes command arguments as a RESP array of binary-safe bulk strings.
 *
 * @stability unstable
 * @category encoding
 * @since 4.0.0
 */
export const encode: (args: ReadonlyArray<Argument>) => Uint8Array = internal.encode

/**
 * Creates a bounded incremental RESP2/RESP3 parser, including streamed strings
 * and streamed arrays, maps, and sets.
 *
 * **Details**
 *
 * Defaults allow 64 MiB per complete reply, 128 aggregate nesting levels, and
 * one million members per aggregate. Frame limits include metadata and nested
 * replies. Bodies split across chunks are filled in place rather than
 * re-buffered.
 *
 * **Gotchas**
 *
 * A protocol failure permanently closes the parser and discards replies decoded
 * earlier in that call. Call `end` when the transport reaches EOF to detect
 * truncated replies.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeParser: (options?: ParserOptions) => Parser = internal.makeParser

/**
 * Converts replies to JavaScript values with UTF-8 strings and safe integer numbers.
 *
 * **Details**
 *
 * Maps and sets become native collections, big numbers remain `bigint`, nested
 * errors become `RedisError` values, and attributes unwrap to their value.
 *
 * **Gotchas**
 *
 * Throws a decode error for integer replies outside JavaScript's safe integer
 * range. Use the original reply to preserve binary strings, attributes, or
 * arbitrary integer precision.
 *
 * @stability unstable
 * @category decoding
 * @since 4.0.0
 */
export const toValue = (reply: Reply): unknown => {
  switch (reply._tag) {
    case "SimpleString":
      return reply.value
    case "BlobString":
    case "VerbatimString":
      return decoder.decode(reply.value)
    case "Integer": {
      const value = Number(reply.value)
      if (!Number.isSafeInteger(value)) {
        throw new RedisError({ reason: "Decode", message: "Redis integer exceeds JavaScript safe integer range" })
      }
      return value
    }
    case "BigNumber":
    case "Double":
    case "Boolean":
      return reply.value
    case "Null":
      return null
    case "Array":
    case "Push":
      return reply.values.map(toValue)
    case "Set":
      return new Set(reply.values.map(toValue))
    case "Map":
      return new Map(reply.entries.map(([key, value]) => [toValue(key), toValue(value)]))
    case "Attribute":
      return toValue(reply.value)
    case "Error":
      return new RedisError({ reason: "Server", message: reply.message, code: reply.code })
  }
}
