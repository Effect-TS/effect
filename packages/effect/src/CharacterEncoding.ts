/**
 * Character-set conversion with typed failures and stateful Effect streams.
 * Unicode and table-driven legacy codecs operate on Uint8Array without Node
 * dependencies. Mapping data is derived from iconv-lite; see the internal data
 * files for attribution. This module does not provide Base64 or hex encoding.
 *
 * @since 4.0.0
 */
import * as Arr from "./Array.ts"
import * as Data from "./Data.ts"
import * as Effect from "./Effect.ts"
import * as Registry from "./internal/characterEncoding/registry.ts"
import { concat } from "./internal/characterEncoding/types.ts"
import * as Stream from "./Stream.ts"

/**
 * Options controlling conversion errors and Unicode byte-order marks.
 * `fatal` defaults to false, replacing invalid/unrepresentable input. Unicode
 * BOMs are stripped when decoding unless `stripBOM` is false; encoding adds a
 * BOM only when `addBOM` is true. UTF-16 endianness must be explicit.
 *
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly fatal?: boolean
  readonly stripBOM?: boolean
  readonly addBOM?: boolean
}

/**
 * A conversion failure, including unsupported encoding labels, malformed byte
 * sequences and characters unavailable in a target character set.
 *
 * @category errors
 * @since 4.0.0
 */
export class CharacterEncodingError extends Data.TaggedError("CharacterEncodingError")<{
  readonly encoding: string
  readonly operation: "encode" | "decode"
  readonly message: string
  readonly cause: unknown
}> {}

/**
 * An incremental encoder. Calls must be sequential; call `end` once on normal
 * completion to flush pending characters. Methods throw CharacterEncodingError.
 * Create a separate instance for each independent conversion.
 *
 * @category models
 * @since 4.0.0
 */
export interface Encoder {
  readonly write: (text: string) => Uint8Array
  readonly end: () => Uint8Array
}

/**
 * An incremental decoder. Calls must be sequential; call `end` once on normal
 * completion to detect incomplete input. Methods throw CharacterEncodingError.
 * Create a separate instance for each independent conversion.
 *
 * @category models
 * @since 4.0.0
 */
export interface Decoder {
  readonly write: (bytes: Uint8Array) => string
  readonly end: () => string
}

const attempt = <A>(encoding: string, operation: "encode" | "decode", f: () => A): A => {
  try {
    return f()
  } catch (cause) {
    if (cause instanceof CharacterEncodingError) throw cause
    throw new CharacterEncodingError({ encoding, operation, message: String(cause), cause })
  }
}

/**
 * Supported canonical encoding names. Common iconv-lite aliases are accepted
 * by conversion functions. This list excludes aliases and non-character codecs.
 *
 * @category encodings
 * @since 4.0.0
 */
export const encodings: ReadonlyArray<string> = Registry.names

/**
 * Tests whether a label resolves to a supported character encoding.
 *
 * @category encodings
 * @since 4.0.0
 */
export const encodingExists = (encoding: string): boolean => {
  try {
    Registry.normalize(encoding)
    return true
  } catch {
    return false
  }
}

/**
 * Creates a fresh incremental encoder, throwing on unsupported labels.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeEncoderUnsafe = (encoding: string, options: Options = {}): Encoder => {
  const encoder = attempt(encoding, "encode", () => Registry.encoder(encoding, options))
  let ended = false
  return {
    write: (text) =>
      attempt(encoding, "encode", () => {
        if (ended) throw new Error("Encoder already ended")
        return encoder.write(text)
      }),
    end: () =>
      attempt(encoding, "encode", () => {
        if (ended) throw new Error("Encoder already ended")
        ended = true
        return encoder.end()
      })
  }
}

/**
 * Creates a fresh incremental decoder, throwing on unsupported labels.
 *
 * @category constructors
 * @since 4.0.0
 */
export const makeDecoderUnsafe = (encoding: string, options: Options = {}): Decoder => {
  const decoder = attempt(encoding, "decode", () => Registry.decoder(encoding, options))
  let ended = false
  return {
    write: (bytes) =>
      attempt(encoding, "decode", () => {
        if (ended) throw new Error("Decoder already ended")
        return decoder.write(bytes)
      }),
    end: () =>
      attempt(encoding, "decode", () => {
        if (ended) throw new Error("Decoder already ended")
        ended = true
        return decoder.end()
      })
  }
}

/**
 * Encodes a complete string, throwing CharacterEncodingError on failure.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encodeUnsafe = (text: string, encoding: string, options?: Options): Uint8Array => {
  const encoder = makeEncoderUnsafe(encoding, options)
  return concat(encoder.write(text), encoder.end())
}

/**
 * Decodes a complete byte array, throwing CharacterEncodingError on failure.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeUnsafe = (bytes: Uint8Array, encoding: string, options?: Options): string => {
  const decoder = makeDecoderUnsafe(encoding, options)
  return decoder.write(bytes) + decoder.end()
}

/**
 * Encodes a string with conversion errors in the Effect error channel.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encode = (
  text: string,
  encoding: string,
  options?: Options
): Effect.Effect<Uint8Array, CharacterEncodingError> =>
  Effect.try({ try: () => encodeUnsafe(text, encoding, options), catch: (error) => error as CharacterEncodingError })

/**
 * Decodes bytes with conversion errors in the Effect error channel.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decode = (
  bytes: Uint8Array,
  encoding: string,
  options?: Options
): Effect.Effect<string, CharacterEncodingError> =>
  Effect.try({ try: () => decodeUnsafe(bytes, encoding, options), catch: (error) => error as CharacterEncodingError })

const transform = <I, O, E, R>(
  self: Stream.Stream<I, E, R>,
  make: () => {
    readonly write: (input: I) => O
    readonly end: () => O
  },
  batch: boolean
): Stream.Stream<O, E | CharacterEncodingError, R> =>
  Stream.unwrap(Effect.map(
    Effect.try({ try: make, catch: (error) => error as CharacterEncodingError }),
    (converter) =>
      Stream.concat(
        batch ?
          Stream.mapArrayEffect(self, (inputs) =>
            Effect.try({
              try: () => Arr.map(inputs, converter.write),
              catch: (error) => error as CharacterEncodingError
            })) :
          Stream.mapEffect(self, (input) =>
            Effect.try({
              try: () => converter.write(input),
              catch: (error) => error as CharacterEncodingError
            })),
        Stream.fromEffect(Effect.try({ try: converter.end, catch: (error) => error as CharacterEncodingError }))
      )
  ))

/**
 * Encodes a stream incrementally, preserving split surrogate pairs and codec
 * state. Each run gets fresh state. Flushes only on normal upstream completion,
 * not on interruption or failure, and inherits upstream backpressure.
 *
 * @category streaming
 * @since 4.0.0
 */
export const encodeStream =
  (encoding: string, options?: Options) =>
  <E, R>(self: Stream.Stream<string, E, R>): Stream.Stream<Uint8Array, E | CharacterEncodingError, R> =>
    transform(self, () => makeEncoderUnsafe(encoding, options), !options?.fatal)

/**
 * Decodes a stream incrementally, retaining partial multibyte sequences across
 * chunks. Flushes exactly once on normal completion; fatal errors at EOF remain
 * typed failures. No buffering of the entire input is required.
 *
 * @category streaming
 * @since 4.0.0
 */
export const decodeStream =
  (encoding: string, options?: Options) =>
  <E, R>(self: Stream.Stream<Uint8Array, E, R>): Stream.Stream<string, E | CharacterEncodingError, R> =>
    transform(self, () => makeDecoderUnsafe(encoding, options), !options?.fatal)

/**
 * Converts a byte stream from one character encoding into another without
 * collecting it. Decode and encode options are independent.
 *
 * @category streaming
 * @since 4.0.0
 */
export const transcodeStream =
  (from: string, to: string, options?: { readonly decode?: Options; readonly encode?: Options }) =>
  <E, R>(self: Stream.Stream<Uint8Array, E, R>): Stream.Stream<Uint8Array, E | CharacterEncodingError, R> =>
    transform(self, () => {
      const decoder = makeDecoderUnsafe(from, options?.decode)
      const encoder = makeEncoderUnsafe(to, options?.encode)
      return {
        write: (bytes) => encoder.write(decoder.write(bytes)),
        end: () => concat(encoder.write(decoder.end()), encoder.end())
      }
    }, !options?.decode?.fatal && !options?.encode?.fatal)
