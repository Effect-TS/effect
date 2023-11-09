/**
 * This module provides encoding & decoding functionality for:
 *
 * - base64 (RFC4648)
 * - base64 (URL)
 * - hex
 *
 * @since 2.0.0
 */
import * as Either from "./Either.js"
import * as Base64 from "./internal/encoding/base64.js"
import * as Base64Url from "./internal/encoding/base64Url.js"
import * as Common from "./internal/encoding/common.js"
import * as Hex from "./internal/encoding/hex.js"

/**
 * Encodes the given value into a base64 (RFC4648) `string`.
 *
 * @category encoding
 * @since 2.0.0
 */
export const encodeBase64: (input: Uint8Array | string) => string = (input) =>
  typeof input === "string" ? Base64.encode(Common.encoder.encode(input)) : Base64.encode(input)

/**
 * Decodes a base64 (RFC4648) encoded `string` into a `Uint8Array`.
 *
 * @category decoding
 * @since 2.0.0
 */
export const decodeBase64 = (str: string): Either.Either<DecodeException, Uint8Array> => Base64.decode(str)

/**
 * Decodes a base64 (RFC4648) encoded `string` into a UTF-8 `string`.
 *
 * @category decoding
 * @since 2.0.0
 */
export const decodeBase64String = (str: string) => Either.map(decodeBase64(str), (_) => Common.decoder.decode(_))

/**
 * Encodes the given value into a base64 (URL) `string`.
 *
 * @category encoding
 * @since 2.0.0
 */
export const encodeBase64Url: (input: Uint8Array | string) => string = (input) =>
  typeof input === "string" ? Base64Url.encode(Common.encoder.encode(input)) : Base64Url.encode(input)

/**
 * Decodes a base64 (URL) encoded `string` into a `Uint8Array`.
 *
 * @category decoding
 * @since 2.0.0
 */
export const decodeBase64Url = (str: string): Either.Either<DecodeException, Uint8Array> => Base64Url.decode(str)

/**
 * Decodes a base64 (URL) encoded `string` into a UTF-8 `string`.
 *
 * @category decoding
 * @since 2.0.0
 */
export const decodeBase64UrlString = (str: string) => Either.map(decodeBase64Url(str), (_) => Common.decoder.decode(_))

/**
 * Encodes the given value into a hex `string`.
 *
 * @category encoding
 * @since 2.0.0
 */
export const encodeHex: (input: Uint8Array | string) => string = (input) =>
  typeof input === "string" ? Hex.encode(Common.encoder.encode(input)) : Hex.encode(input)

/**
 * Decodes a hex encoded `string` into a `Uint8Array`.
 *
 * @category decoding
 * @since 2.0.0
 */
export const decodeHex = (str: string): Either.Either<DecodeException, Uint8Array> => Hex.decode(str)

/**
 * Decodes a hex encoded `string` into a UTF-8 `string`.
 *
 * @category decoding
 * @since 2.0.0
 */
export const decodeHexString = (str: string) => Either.map(decodeHex(str), (_) => Common.decoder.decode(_))

/**
 * @since 2.0.0
 * @category symbols
 */
export const DecodeExceptionTypeId: unique symbol = Common.DecodeExceptionTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type DecodeExceptionTypeId = typeof DecodeExceptionTypeId

/**
 * Represents a checked exception which occurs when decoding fails.
 *
 * @since 2.0.0
 * @category models
 */
export interface DecodeException {
  readonly _tag: "DecodeException"
  readonly [DecodeExceptionTypeId]: DecodeExceptionTypeId
  readonly input: string
  readonly message?: string
}

/**
 * Creates a checked exception which occurs when decoding fails.
 *
 * @since 2.0.0
 * @category errors
 */
export const DecodeException: (input: string, message?: string) => DecodeException = Common.DecodeException

/**
 * Returns `true` if the specified value is an `DecodeException`, `false` otherwise.
 *
 * @since 2.0.0
 * @category refinements
 */
export const isDecodeException: (u: unknown) => u is DecodeException = Common.isDecodeException
