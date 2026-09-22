/**
 * URL-safe Base64 encoding and decoding helpers.
 *
 * @since 4.0.0
 */
import * as Result from "../Result.ts"
import * as Base64 from "./Base64.ts"
import { EncodingError } from "./EncodingError.ts"

/**
 * Encodes text or bytes as unpadded URL-safe Base64.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encode: (input: Uint8Array | string) => string = (input) =>
  Base64.encode(input).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")

/**
 * Decodes padded or unpadded URL-safe Base64 into bytes.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decode = (str: string): Result.Result<Uint8Array, EncodingError> => {
  const stripped = str.replace(/[\n\r]/g, "")
  const length = stripped.length
  if (length % 4 === 1) {
    return Result.fail(
      new EncodingError({
        module: "Base64Url",
        kind: "Decode",
        input: stripped,
        message: `Length should be a multiple of 4, but is ${length}`
      })
    )
  }
  if (!/^[-_A-Z0-9]*?={0,2}$/i.test(stripped)) {
    return Result.fail(
      new EncodingError({
        module: "Base64Url",
        kind: "Decode",
        input: stripped,
        message: "Invalid input"
      })
    )
  }
  let sanitized = length % 4 === 2 ? `${stripped}==` : length % 4 === 3 ? `${stripped}=` : stripped
  sanitized = sanitized.replace(/-/g, "+").replace(/_/g, "/")
  return Base64.decode(sanitized)
}

/**
 * Decodes padded or unpadded URL-safe Base64 into UTF-8 text.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeString = (str: string) => Result.map(decode(str), (_) => decoder.decode(_))

const decoder = new TextDecoder()
