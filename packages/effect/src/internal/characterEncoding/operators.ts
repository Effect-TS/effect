import type { CharacterEncodingError, Encoding, Options } from "../../CharacterEncoding.ts"
import * as Effect from "../../Effect.ts"
import * as Stream from "../../Stream.ts"
import { concat } from "./types.ts"

type Operation = "encode" | "decode"

// Codec modules deliberately avoid importing Data.ts so that a single-codec
// bundle stays small. Failures therefore carry the CharacterEncodingError
// shape and tag without being instances of the class.
const attempt = <A>(encoding: string, operation: Operation, f: () => A): A => {
  try {
    return f()
  } catch (cause) {
    throw { _tag: "CharacterEncodingError", encoding, operation, message: String(cause), cause }
  }
}

const tryEffect = <A>(f: () => A): Effect.Effect<A, CharacterEncodingError> =>
  Effect.try({ try: f, catch: (error) => error as CharacterEncodingError })

/** Encodes a complete string with the given codec, throwing on failure. */
export const encodeUnsafe = (encoding: Encoding, text: string, options?: Options): Uint8Array =>
  attempt(encoding.name, "encode", () => {
    const encoder = encoding.makeEncoder(options ?? {})
    return concat(encoder.write(text), encoder.end())
  })

/** Decodes complete bytes with the given codec, throwing on failure. */
export const decodeUnsafe = (encoding: Encoding, bytes: Uint8Array, options?: Options): string =>
  attempt(encoding.name, "decode", () => {
    const decoder = encoding.makeDecoder(options ?? {})
    return decoder.write(bytes) + decoder.end()
  })

/** Encodes a complete string with failures in the Effect error channel. */
export const encode = (
  encoding: Encoding,
  text: string,
  options?: Options
): Effect.Effect<Uint8Array, CharacterEncodingError> => tryEffect(() => encodeUnsafe(encoding, text, options))

/** Decodes complete bytes with failures in the Effect error channel. */
export const decode = (
  encoding: Encoding,
  bytes: Uint8Array,
  options?: Options
): Effect.Effect<string, CharacterEncodingError> => tryEffect(() => decodeUnsafe(encoding, bytes, options))

/** Runs a fresh incremental converter over a stream, flushing once on normal completion. */
const transform = <I, O, E, R>(
  self: Stream.Stream<I, E, R>,
  encoding: string,
  operation: Operation,
  make: () => { readonly write: (input: I) => O; readonly end: () => O }
): Stream.Stream<O, E | CharacterEncodingError, R> =>
  Stream.unwrap(Effect.map(
    tryEffect(() => attempt(encoding, operation, make)),
    (converter) =>
      Stream.concat(
        Stream.mapEffect(self, (input) => tryEffect(() => attempt(encoding, operation, () => converter.write(input)))),
        Stream.fromEffect(tryEffect(() => attempt(encoding, operation, converter.end)))
      )
  ))

/** Encodes a stream of strings incrementally with the given codec. */
export const encodeStream =
  (encoding: Encoding, options?: Options) =>
  <E, R>(self: Stream.Stream<string, E, R>): Stream.Stream<Uint8Array, E | CharacterEncodingError, R> =>
    transform(self, encoding.name, "encode", () => encoding.makeEncoder(options ?? {}))

/** Decodes a stream of bytes incrementally with the given codec. */
export const decodeStream =
  (encoding: Encoding, options?: Options) =>
  <E, R>(self: Stream.Stream<Uint8Array, E, R>): Stream.Stream<string, E | CharacterEncodingError, R> =>
    transform(self, encoding.name, "decode", () => encoding.makeDecoder(options ?? {}))
