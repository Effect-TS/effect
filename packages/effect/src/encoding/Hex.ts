/**
 * Hexadecimal encoding, decoding, and random value helpers.
 *
 * @since 4.0.0
 */
import * as Encoding from "../Encoding.ts"

/**
 * Encodes text or bytes as lowercase hexadecimal text.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encode: (input: Uint8Array | string) => string = Encoding.encodeHex

/**
 * Decodes hexadecimal text into bytes.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decode = Encoding.decodeHex

/**
 * Decodes hexadecimal text into UTF-8 text.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeString = Encoding.decodeHexString

/**
 * Generates a random lowercase hexadecimal string, using the same unsigned
 * 32-bit coercion and rounding behavior as {@link Encoding.randomHex}.
 *
 * @category encoding
 * @since 4.0.0
 */
export const random = Encoding.randomHex
