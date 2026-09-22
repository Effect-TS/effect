/**
 * Base64 encoding and decoding helpers.
 *
 * @since 4.0.0
 */
import * as Encoding from "../Encoding.ts"

/**
 * Encodes text or bytes as standard padded Base64.
 *
 * @category encoding
 * @since 4.0.0
 */
export const encode: (input: Uint8Array | string) => string = Encoding.encodeBase64

/**
 * Decodes standard padded Base64 into bytes.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decode = Encoding.decodeBase64

/**
 * Decodes standard padded Base64 into UTF-8 text.
 *
 * @category decoding
 * @since 4.0.0
 */
export const decodeString = Encoding.decodeBase64String
