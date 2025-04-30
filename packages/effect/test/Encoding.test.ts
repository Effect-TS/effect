import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Either, Encoding } from "effect"

describe("Base64", () => {
  const valid: Array<[string, string]> = [
    ["", ""],
    ["ß", "w58="],
    ["f", "Zg=="],
    ["fo", "Zm8="],
    ["foo", "Zm9v"],
    ["foob", "Zm9vYg=="],
    ["fooba", "Zm9vYmE="],
    ["foobar", "Zm9vYmFy"]
  ]

  const invalid: Array<string> = [
    "ab\fcd",
    "ab\t\n\f\r cd",
    " \t\n\f\r ab\t\n\f\r cd\t\n\f\r ",
    "a=b",
    "abc=d",
    "a",
    "ab\t\n\f\r =\t\n\f\r =\t\n\f\r ",
    "abcde",
    "ab=c",
    "=a",
    "ab\u00a0cd",
    "A",
    "////A",
    "/",
    "AAAA/",
    "\0nonsense",
    "abcd\0nonsense"
  ]

  it.each(valid)(`should decode %j <= %j`, (raw: string, b64: string) => {
    const bytes = new TextEncoder().encode(raw)
    const decoded = Encoding.decodeBase64(b64)
    assertTrue(Either.isRight(decoded))
    deepStrictEqual(decoded.right, bytes)
  })

  it.each(valid)(`should decode %j <= %j (to string)`, (raw: string, b64: string) => {
    const decoded = Encoding.decodeBase64String(b64)
    assertTrue(Either.isRight(decoded))
    deepStrictEqual(decoded.right, raw)
  })

  it.each(valid)(`should encode %j => %j`, (raw: string, b64: string) => {
    strictEqual(Encoding.encodeBase64(raw), b64)
    strictEqual(Encoding.encodeBase64(new TextEncoder().encode(raw)), b64)
  })

  it.each(invalid)(`should refuse to decode %j`, (b64: string) => {
    const result = Encoding.decodeBase64(b64)
    assertTrue(Either.isLeft(result))
    assertTrue(Encoding.isDecodeException(result.left))
  })
})

describe("Base64Url", () => {
  const valid: Array<[string, string]> = [
    ["", ""],
    ["ß", "w58"],
    ["f", "Zg"],
    ["fo", "Zm8"],
    ["foo", "Zm9v"],
    ["foob", "Zm9vYg"],
    ["fooba", "Zm9vYmE"],
    ["foobar", "Zm9vYmFy"],
    [">?>d?ß", "Pj8-ZD_Dnw"]
  ]

  const invalid: Array<string> = [
    "Pj8/ZD+Dnw",
    "PDw/Pz8+Pg",
    "Pj8/ZD+Dnw==",
    "PDw/Pz8+Pg=="
  ]

  it.each(valid)(`should decode %j <= %j`, (raw: string, b64url: string) => {
    const bytes = new TextEncoder().encode(raw)
    const decoded = Encoding.decodeBase64Url(b64url)
    assertTrue(Either.isRight(decoded))
    deepStrictEqual(decoded.right, bytes)
  })

  it.each(valid)(`should decode %j <= %j (to string)`, (raw: string, b64: string) => {
    const decoded = Encoding.decodeBase64UrlString(b64)
    assertTrue(Either.isRight(decoded))
    deepStrictEqual(decoded.right, raw)
  })

  it.each(valid)(`should encode %j => %j`, (raw: string, b64url: string) => {
    strictEqual(Encoding.encodeBase64Url(raw), b64url)
    strictEqual(Encoding.encodeBase64Url(new TextEncoder().encode(raw)), b64url)
  })

  it.each(invalid)(`should refuse to decode %j`, (b64url: string) => {
    const result = Encoding.decodeBase64Url(b64url)
    assertTrue(Either.isLeft(result))
    assertTrue(Encoding.isDecodeException(result.left))
  })
})

describe("Hex", () => {
  const valid: Array<[hex: string, bytes: Uint8Array]> = [
    ["", Uint8Array.from([])],
    ["0001020304050607", Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7])],
    ["08090a0b0c0d0e0f", Uint8Array.from([8, 9, 10, 11, 12, 13, 14, 15])],
    ["f0f1f2f3f4f5f6f7", Uint8Array.from([0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7])],
    ["f8f9fafbfcfdfeff", Uint8Array.from([0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff])],
    ["67", new TextEncoder().encode("g")],
    ["e3a1", Uint8Array.from([0xe3, 0xa1])]
  ]

  const strings: Array<[hex: string, raw: string]> = [
    ["", ""],
    ["68656c6c6f20776f726c64", "hello world"],
    ["666f6f", "foo"],
    ["666f6f20626172", "foo bar"],
    ["67", "g"]
  ]

  const invalid: Array<string> = [
    "0",
    "zd4aa",
    "d4aaz",
    "30313",
    "0g",
    "00gg",
    "0\x01",
    "ffeed"
  ]

  it.each(valid)(`should decode %j => %o`, (hex: string, bytes: Uint8Array) => {
    const decoded = Encoding.decodeHex(hex)
    assertTrue(Either.isRight(decoded))
    deepStrictEqual(decoded.right, bytes)
  })

  it.each(strings)(`should decode %j => %j to string`, (hex: string, str: string) => {
    const decoded = Encoding.decodeHexString(hex)
    assertTrue(Either.isRight(decoded))
    deepStrictEqual(decoded.right, str)
  })

  it.each(valid)(`should encode %j <= %o`, (hex: string, bytes: Uint8Array) => {
    strictEqual(Encoding.encodeHex(bytes), hex)
  })

  it.each(strings)(`should encode %j <= %j`, (hex: string, raw: string) => {
    strictEqual(Encoding.encodeHex(raw), hex)
  })

  it.each(invalid)(`should refuse to decode %j`, (hex: string) => {
    const result = Encoding.decodeHex(hex)
    assertTrue(Either.isLeft(result))
    assertTrue(Encoding.isDecodeException(result.left))
  })
})

describe("UriComponent", () => {
  const valid: Array<[uri: string, raw: string]> = [
    ["", ""],
    ["hello", "hello"],
    ["hello%20world", "hello world"],
    ["hello%20world%2F", "hello world/"],
    ["%20", " "],
    ["%2F", "/"]
  ]

  const invalidDecode: Array<string> = [
    "hello%2world"
  ]

  const invalidEncode: Array<string> = [
    "\uD800",
    "\uDFFF"
  ]

  it.each(valid)(`should decode %j => %j`, (uri: string, raw: string) => {
    const decoded = Encoding.decodeUriComponent(uri)
    assertTrue(Either.isRight(decoded))
    deepStrictEqual(decoded.right, raw)
  })

  it.each(valid)(`should encode %j => %j`, (uri: string, raw: string) => {
    const encoded = Encoding.encodeUriComponent(raw)
    assertTrue(Either.isRight(encoded))
    deepStrictEqual(encoded.right, uri)
  })

  it.each(invalidDecode)(`should refuse to decode %j`, (uri: string) => {
    const result = Encoding.decodeUriComponent(uri)
    assertTrue(Either.isLeft(result))
    assertTrue(Encoding.isDecodeException(result.left))
  })

  it.each(invalidEncode)(`should refuse to encode %j`, (raw: string) => {
    const result = Encoding.encodeUriComponent(raw)
    assertTrue(Either.isLeft(result))
    assertTrue(Encoding.isEncodeException(result.left))
  })
})
