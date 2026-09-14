/**
 * CP775 character encoding with typed failures and Effect streams.
 *
 * @since 4.0.0
 */
import type { CharacterEncodingError, Encoding, Options } from "../CharacterEncoding.ts"
import type * as Effect from "../Effect.ts"
import { make } from "../internal/characterEncoding/codec.ts"
import data from "../internal/characterEncoding/cp775Data.ts"
import * as Operators from "../internal/characterEncoding/operators.ts"
import { SingleByte } from "../internal/characterEncoding/singleByte.ts"
import type * as Stream from "../Stream.ts"

/**
 * The cp775 codec descriptor, for use with the CharacterEncoding operators.
 *
 * @category encodings
 * @since 4.0.0
 */
export const encoding: Encoding = /* @__PURE__ */ make("cp775", () => new SingleByte(data))

/**
 * Encodes a complete string to cp775 bytes, throwing CharacterEncodingError on failure.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeUnsafe = (text: string, options?: Options): Uint8Array =>
  Operators.encodeUnsafe(encoding, text, options)

/**
 * Decodes complete cp775 bytes to a string, throwing CharacterEncodingError on failure.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeUnsafe = (bytes: Uint8Array, options?: Options): string =>
  Operators.decodeUnsafe(encoding, bytes, options)

/**
 * Encodes a string to cp775 bytes with conversion errors in the Effect error channel.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encode = (text: string, options?: Options): Effect.Effect<Uint8Array, CharacterEncodingError> =>
  Operators.encode(encoding, text, options)

/**
 * Decodes cp775 bytes to a string with conversion errors in the Effect error channel.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decode = (bytes: Uint8Array, options?: Options): Effect.Effect<string, CharacterEncodingError> =>
  Operators.decode(encoding, bytes, options)

/**
 * Encodes a stream of strings to cp775 bytes incrementally, preserving codec state across chunks.
 *
 * @category streaming
 * @since 4.0.0
 */
export const encodeStream = (
  options?: Options
): <E, R>(self: Stream.Stream<string, E, R>) => Stream.Stream<Uint8Array, E | CharacterEncodingError, R> =>
  Operators.encodeStream(encoding, options)

/**
 * Decodes a stream of cp775 bytes to strings incrementally, retaining partial sequences across chunks.
 *
 * @category streaming
 * @since 4.0.0
 */
export const decodeStream = (
  options?: Options
): <E, R>(self: Stream.Stream<Uint8Array, E, R>) => Stream.Stream<string, E | CharacterEncodingError, R> =>
  Operators.decodeStream(encoding, options)
