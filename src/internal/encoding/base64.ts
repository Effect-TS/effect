import * as Either from "../../Either.js"
import type * as Encoding from "../../Encoding.js"
import { DecodeException } from "./common.js"

/** @internal */
export const encode = (bytes: Uint8Array) => {
  const length = bytes.length

  let result = ""
  let i: number

  for (i = 2; i < length; i += 3) {
    result += base64abc[bytes[i - 2] >> 2]
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)]
    result += base64abc[((bytes[i - 1] & 0x0f) << 2) | (bytes[i] >> 6)]
    result += base64abc[bytes[i] & 0x3f]
  }

  if (i === length + 1) {
    // 1 octet yet to write
    result += base64abc[bytes[i - 2] >> 2]
    result += base64abc[(bytes[i - 2] & 0x03) << 4]
    result += "=="
  }

  if (i === length) {
    // 2 octets yet to write
    result += base64abc[bytes[i - 2] >> 2]
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)]
    result += base64abc[(bytes[i - 1] & 0x0f) << 2]
    result += "="
  }

  return result
}

/** @internal */
export const decode = (str: string): Either.Either<Encoding.DecodeException, Uint8Array> => {
  const length = str.length
  if (length % 4 !== 0) {
    return Either.left(
      DecodeException(str, `Length must be a multiple of 4, but is ${length}`)
    )
  }

  const index = str.indexOf("=")
  if (index !== -1 && ((index < length - 2) || (index === length - 2 && str[length - 1] !== "="))) {
    return Either.left(
      DecodeException(str, "Found a '=' character, but it is not at the end")
    )
  }

  try {
    const missingOctets = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0
    const result = new Uint8Array(3 * (length / 4))
    for (let i = 0, j = 0; i < length; i += 4, j += 3) {
      const buffer = getBase64Code(str.charCodeAt(i)) << 18 |
        getBase64Code(str.charCodeAt(i + 1)) << 12 |
        getBase64Code(str.charCodeAt(i + 2)) << 6 |
        getBase64Code(str.charCodeAt(i + 3))

      result[j] = buffer >> 16
      result[j + 1] = (buffer >> 8) & 0xff
      result[j + 2] = buffer & 0xff
    }

    return Either.right(result.subarray(0, result.length - missingOctets))
  } catch (e) {
    return Either.left(
      DecodeException(str, e instanceof Error ? e.message : "Invalid input")
    )
  }
}

/** @internal */
function getBase64Code(charCode: number) {
  if (charCode >= base64codes.length) {
    throw new TypeError(`Invalid character ${String.fromCharCode(charCode)}`)
  }

  const code = base64codes[charCode]
  if (code === 255) {
    throw new TypeError(`Invalid character ${String.fromCharCode(charCode)}`)
  }

  return code
}

/** @internal */
const base64abc = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "+",
  "/"
]

/** @internal */
const base64codes = [
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  255,
  62,
  255,
  255,
  255,
  63,
  52,
  53,
  54,
  55,
  56,
  57,
  58,
  59,
  60,
  61,
  255,
  255,
  255,
  0,
  255,
  255,
  255,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  255,
  255,
  255,
  255,
  255,
  255,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  36,
  37,
  38,
  39,
  40,
  41,
  42,
  43,
  44,
  45,
  46,
  47,
  48,
  49,
  50,
  51
]
