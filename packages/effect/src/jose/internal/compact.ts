import type * as CryptoError from "../../crypto/CryptoError.ts"
import * as Duration from "../../Duration.ts"
import * as Effect from "../../Effect.ts"
import * as Base64Url from "../../encoding/Base64Url.ts"
import * as Option from "../../Option.ts"
import * as Redacted from "../../Redacted.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as JoseError from "../JoseError.ts"

/** @internal */
export const fail = (reason: JoseError.JoseErrorReason): Effect.Effect<never, JoseError.JoseError> =>
  Effect.fail(new JoseError.JoseError({ reason }))

/** @internal */
export const invalidToken = (description: string) => fail(new JoseError.InvalidToken({ description }))

/** @internal */
export const invalidKey = (description: string, cause?: unknown) =>
  fail(new JoseError.InvalidKey({ description, cause }))

/** @internal */
export const invalidArgument = (description: string, cause?: unknown) =>
  fail(new JoseError.InvalidArgument({ description, cause }))

/** @internal */
export const fromCryptoError = (error: CryptoError.CryptoError): JoseError.JoseError =>
  new JoseError.JoseError({ reason: new JoseError.InvalidKey({ description: error.message, cause: error }) })

/** @internal */
export const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)

/** @internal */
export const reveal = (token: string | Redacted.Redacted<string>): string =>
  Redacted.isRedacted(token) ? Redacted.value(token) : token

/**
 * Decodes unpadded base64url. Re-encoding must give the same text, which
 * rejects padding, whitespace, and non-zero trailing bits, so every value has
 * one serialization.
 *
 * @internal
 */
export const decodeSegment = (segment: string): Uint8Array | undefined => {
  if (!/^[A-Za-z0-9_-]*$/.test(segment)) return undefined
  const decoded = Base64Url.decode(segment)
  return Result.isSuccess(decoded) && Base64Url.encode(decoded.success) === segment ? decoded.success : undefined
}

/** @internal */
export const parseJsonObject = (bytes: Uint8Array): Readonly<Record<string, Schema.Json>> | undefined => {
  try {
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Readonly<Record<string, Schema.Json>>
      : undefined
  } catch {
    return undefined
  }
}

/**
 * Splits a compact serialization into exactly `count` segments.
 *
 * @internal
 */
export const split = (
  token: string | Redacted.Redacted<string>,
  count: number
): Effect.Effect<ReadonlyArray<string>, JoseError.JoseError> => {
  const parts = reveal(token).split(".")
  return parts.length === count
    ? Effect.succeed(parts)
    : invalidToken(`A compact serialization must have ${count} segments`)
}

/**
 * Decodes a protected header. Parameters in `unsupported` change how the
 * token is processed, so they are rejected rather than ignored.
 *
 * @internal
 */
export const decodeHeader = <S extends Schema.ConstraintDecoder<unknown>>(
  segment: string,
  schema: S,
  unsupported: ReadonlyArray<string>
): Effect.Effect<S["Type"], JoseError.JoseError> => {
  const bytes = decodeSegment(segment)
  const json = bytes === undefined ? undefined : parseJsonObject(bytes)
  if (json === undefined) return invalidToken("The protected header is not a base64url JSON object")
  for (const name of unsupported) {
    if (Object.hasOwn(json, name)) return invalidToken(`The ${name} header parameter is not supported`)
  }
  return Option.match(Schema.decodeUnknownOption(schema)(json), {
    onNone: () => invalidToken("The protected header has unsupported or malformed parameters"),
    onSome: Effect.succeed
  })
}

/**
 * Base64url-encodes a protected header. The fixed parameters come first, so
 * `{ alg }` serializes as `{"alg":...}`.
 *
 * @internal
 */
export const encodeHeader = (
  fixed: Readonly<Record<string, string>>,
  kid: string | undefined,
  header:
    | { readonly kid?: string | undefined; readonly typ?: string | undefined; readonly cty?: string | undefined }
    | undefined
): string => {
  const value: Record<string, string> = { ...fixed }
  const keyId = header?.kid ?? kid
  if (keyId !== undefined) value.kid = keyId
  if (header?.typ !== undefined) value.typ = header.typ
  if (header?.cty !== undefined) value.cty = header.cty
  return Base64Url.encode(JSON.stringify(value))
}

/**
 * Reads a finite, non-negative duration in milliseconds.
 *
 * @internal
 */
export const millis = (name: string, input: Duration.Input): Effect.Effect<number, JoseError.JoseError> => {
  // `Duration` reads NaN as zero, which would silently disable a bound.
  const value = typeof input === "number" && Number.isNaN(input)
    ? Option.none()
    : Option.map(Duration.fromInput(input), Duration.toMillis)
  return Option.isSome(value) && Number.isFinite(value.value) && value.value >= 0
    ? Effect.succeed(value.value)
    : invalidArgument(`${name} must be a finite, non-negative duration`)
}
