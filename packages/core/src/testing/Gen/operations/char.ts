import type { NumberConstraints } from "@effect/core/testing/Gen"

const gapSize = 0xdfff + 1 - 0xd800

/**
 * A generator of alpha characters.
 *
 * @tsplus static effect/core/testing/Gen.Ops alphaChar
 */
export const alphaChar: Gen<never, string> = Gen.weighted(
  [Gen.char({ min: 65, max: 90 }), 26],
  [Gen.char({ min: 97, max: 122 }), 26]
)

/**
 * A generator of alphanumeric characters. Shrinks toward '0'.
 *
 * @tsplus static effect/core/testing/Gen.Ops alphaNumericChar
 */
export const alphaNumericChar: Gen<never, string> = Gen.weighted(
  [Gen.char({ min: 48, max: 57 }), 10],
  [Gen.char({ min: 65, max: 90 }), 26],
  [Gen.char({ min: 97, max: 122 }), 26]
)

/**
 * A generator of US-ASCII characters. Shrinks toward '0'.
 *
 * @tsplus static effect/core/testing/Gen.Ops asciiChar
 */
export const asciiChar: Gen<never, string> = _char(0x00, 0x7f, indexToPrintableIndex)

/**
 * A generator of base-64 characters. Shrinks towards '0'.
 *
 * @tsplus static effect/core/testing/Gen.Ops base64Char
 */
export const base64Char: Gen<never, string> = _char(0, 63, base64ToCharCode)

/**
 * A generator of character values inside the specified range: [start, end].
 * The shrinker will shrink toward the lower end of the range ("smallest").
 *
 * @tsplus static effect/core/testing/Gen.Ops char
 */
export function char(constraints: Required<NumberConstraints>): Gen<never, string> {
  return _char(constraints.min, constraints.max, identity)
}

/**
 * A generator of UTF-16 characters. Shrinks towards '\x00'.
 *
 * @tsplus static effect/core/testing/Gen.Ops char16
 */
export const char16: Gen<never, string> = _char(0x0000, 0xffff, indexToPrintableIndex)

/**
 * @tsplus static effect/core/testing/Gen.Ops fullUnicodeChar
 */
export const fullUnicodeChar: Gen<never, string> = _char(
  0x0000,
  0x10ffff - gapSize,
  unicodeToCharCode
)

/**
 * A generator of numeric characters. Shrinks toward '0'.
 *
 * @tsplus static effect/core/testing/Gen.Ops numericChar
 */
export const numericChar: Gen<never, string> = Gen.weighted(
  [Gen.char({ min: 48, max: 57 }), 10]
)

/**
 * A generator of hex chars(0-9,a-f,A-F).
 *
 * @tsplus static effect/core/testing/Gen.Ops hexChar
 */
export const hexChar: Gen<never, string> = _char(0, 15, hexToCharCode)

/**
 * A generator of lower hex chars(0-9, a-f).
 *
 * @tsplus static effect/core/testing/Gen.Ops hexCharLower
 */
export const hexCharLower: Gen<never, string> = Gen.weighted(
  [_char(48, 57, hexToCharCode), 10],
  [_char(97, 102, hexToCharCode), 6]
)

/**
 * A generator of upper hex chars(0-9, A-F).
 *
 * @tsplus static effect/core/testing/Gen.Ops hexCharUpper
 */
export const hexCharUpper: Gen<never, string> = Gen.weighted(
  [_char(48, 57, hexToCharCode), 10],
  [_char(65, 70, hexToCharCode), 10]
)

/**
 * A generator of printable characters. Shrinks toward '!'.
 *
 * @tsplus static effect/core/testing/Gen.Ops printableChar
 */
export const printableChar: Gen<never, string> = char({ min: 0x20, max: 0x7e })

/**
 * A generator of Unicode characters. Shrinks toward '0'.
 *
 * @tsplus static effect/core/testing/Gen.Ops unicodeChar
 */
export const unicodeChar: Gen<never, string> = _char(0x0000, 0xffff - gapSize, unicodeToCharCode)

function _char(min: number, max: number, mapToCode: (v: number) => number): Gen<never, string> {
  return Gen.int({ min, max }).map((n) => String.fromCharCode(mapToCode(n)))
}

function indexToPrintableIndex(v: number): number {
  return v < 95 ? v + 0x20 : v <= 0x7e ? v - 95 : v
}

function base64ToCharCode(v: number): number {
  if (v < 26) return v + 65 // A-Z
  if (v < 52) return v + 97 - 26 // a-z
  if (v < 62) return v + 48 - 52 // 0-9
  return v === 62 ? 43 : 47 // +/
}

function hexToCharCode(v: number): number {
  return v < 10
    ? v + 48 // 0-9
    : v + 97 - 10 // a-f
}

function unicodeToCharCode(v: number): number {
  return v < 0xd800 ? indexToPrintableIndex(v) : v + gapSize
}
