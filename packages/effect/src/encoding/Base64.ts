/**
 * Base64 encoding and decoding helpers.
 *
 * @since 4.0.0
 */
import * as Result from "../Result.ts"
import { EncodingError } from "./EncodingError.ts"

/**
 * Encodes text or bytes as standard padded Base64.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encode: (input: Uint8Array | string) => string = (input) =>
  encodeBytes(typeof input === "string" ? encoder.encode(input) : input)

/**
 * Decodes standard padded Base64 into bytes.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decode = (str: string): Result.Result<Uint8Array, EncodingError> => {
  const stripped = stripCrlf(str)
  const length = stripped.length
  if (length % 4 !== 0) {
    return Result.fail(
      new EncodingError({
        kind: "Decode",
        module: "Base64",
        input: stripped,
        message: `Length must be a multiple of 4, but is ${length}`
      })
    )
  }

  const index = stripped.indexOf("=")
  if (index !== -1 && ((index < length - 2) || (index === length - 2 && stripped[length - 1] !== "="))) {
    return Result.fail(
      new EncodingError({
        kind: "Decode",
        module: "Base64",
        input: stripped,
        message: "Found a '=' character, but it is not at the end"
      })
    )
  }

  try {
    const missingOctets = stripped.endsWith("==") ? 2 : stripped.endsWith("=") ? 1 : 0
    const result = new Uint8Array(3 * (length / 4) - missingOctets)
    for (let i = 0, j = 0; i < length; i += 4, j += 3) {
      const buffer = getCode(stripped.charCodeAt(i)) << 18 |
        getCode(stripped.charCodeAt(i + 1)) << 12 |
        getCode(stripped.charCodeAt(i + 2)) << 6 |
        getCode(stripped.charCodeAt(i + 3))
      result[j] = buffer >> 16
      result[j + 1] = (buffer >> 8) & 0xff
      result[j + 2] = buffer & 0xff
    }
    return Result.succeed(result)
  } catch (cause) {
    return Result.fail(
      new EncodingError({
        kind: "Decode",
        module: "Base64",
        input: stripped,
        message: cause instanceof Error ? cause.message : "Invalid input"
      })
    )
  }
}

/**
 * Decodes standard padded Base64 into UTF-8 text.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeString = (str: string) => Result.map(decode(str), (_) => decoder.decode(_))

const encodeBytes = (bytes: Uint8Array): string => {
  const length = bytes.length
  let result = ""
  let i: number
  for (i = 2; i < length; i += 3) {
    result += alphabet[bytes[i - 2] >> 2]
    result += alphabet[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)]
    result += alphabet[((bytes[i - 1] & 0x0f) << 2) | (bytes[i] >> 6)]
    result += alphabet[bytes[i] & 0x3f]
  }
  if (i === length + 1) {
    result += alphabet[bytes[i - 2] >> 2]
    result += alphabet[(bytes[i - 2] & 0x03) << 4]
    result += "=="
  }
  if (i === length) {
    result += alphabet[bytes[i - 2] >> 2]
    result += alphabet[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)]
    result += alphabet[(bytes[i - 1] & 0x0f) << 2]
    result += "="
  }
  return result
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const stripCrlf = (str: string) => str.replace(/[\n\r]/g, "")
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const codes = new Uint8Array(123).fill(255)
for (let i = 0; i < alphabet.length; i++) codes[alphabet.charCodeAt(i)] = i
codes["=".charCodeAt(0)] = 0

const getCode = (charCode: number): number => {
  if (charCode >= codes.length || codes[charCode] === 255) {
    throw new TypeError(`Invalid character ${String.fromCharCode(charCode)}`)
  }
  return codes[charCode]
}
