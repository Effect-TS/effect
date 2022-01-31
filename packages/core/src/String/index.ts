// ets_tracing: off

import "../Operator/index.js"

import * as C from "../Closure/index.js"
/**
 * Partially Ported from https://github.com/samhh/fp-ts-std
 * Partially Ported from https://github.com/0x706b/principia
 */
import * as A from "../Collections/Immutable/Array/index.js"
import * as NA from "../Collections/Immutable/NonEmptyArray/index.js"
import * as Eq from "../Equal/index.js"
import { pipe } from "../Function/index.js"
import * as I from "../Identity/index.js"
import type { Sum } from "../Newtype/index.js"
import { StringSum } from "../Newtype/index.js"
import * as O from "../Option/index.js"

export const SumClosure = C.makeClosure<Sum<string>>((l, r) =>
  StringSum.wrap(`${StringSum.unwrap(l)}${StringSum.unwrap(r)}`)
)

export const SumIdentity = I.makeIdentity(StringSum.wrap(""), SumClosure.combine)

export const Equal = Eq.strict<string>()

/**
 * Check if a value is a string
 */
export function isString(u: unknown): u is string {
  return typeof u === "string"
}

/**
 * Check is a string is empty
 */
export function isEmpty(s: string): boolean {
  return s === ""
}

/**
 * Check if a string contains the given substring
 */
export function includes_(s: string, substr: string): boolean {
  return s.includes(substr)
}

/**
 * Check if a string contains the given substring
 *
 * @ets_data_first includes_
 */
export function includes(substr: string): (s: string) => boolean {
  return (s) => s.includes(substr)
}

/**
 * Check if a string starts with the given substring
 */
export function startsWith_(s: string, substr: string): boolean {
  return s.startsWith(substr)
}

/**
 * Check if a string starts with the given substring
 *
 * @ets_data_first startsWith_
 */
export function startsWith(substr: string): (s: string) => boolean {
  return (s) => startsWith_(s, substr)
}

/**
 * Check if a string ends with the given substring
 */
export function endsWith_(s: string, substr: string): boolean {
  return s.endsWith(substr)
}

/**
 * Check if a string ends with the given substring
 *
 * @ets_data_first endsWith_
 */
export function endsWith(substr: string): (s: string) => boolean {
  return (s) => endsWith_(s, substr)
}

/**
 * The empty string
 */
export const empty = ""

/**
 * Converts a number into a string
 */
export function fromNumber(x: number): string {
  return String(x)
}

/**
 * Trim whitespace from both sides of a string
 */
export function trim(s: string): string {
  return s.trim()
}

/**
 * Trim whitespace from the left side of the string
 */
export function trimLeft(s: string): string {
  return s.trimStart()
}

/**
 * Trim whitespace from the right side of the string
 */
export function trimRight(s: string): string {
  return s.trimEnd()
}

/**
 * Prepend one string to another
 */
export function prepend_(s: string, prepend: string): string {
  return prepend + s
}

/**
 * Prepend one string to another
 *
 * @ets_data_first prepend_
 */
export function prepend(prepend: string): (s: string) => string {
  return (s) => prepend + s
}

/**
 * Removes the given string from the beginning, if it exists
 */
export function unprepend_(s: string, s1: string): string {
  return s.startsWith(s1) ? s.substr(s1.length) : s
}

/**
 * Removes the given string from the beginning, if it exists
 *
 * @ets_data_first unprepend_
 */
export function unprepend(s1: string): (s: string) => string {
  return (s) => unprepend_(s, s1)
}

/**
 * Append one string to another.
 */
export function append_(s: string, x: string): string {
  return s + x
}

/**
 * Append one string to another.
 *
 * @ets_data_first append_
 */
export function append(x: string): (s: string) => string {
  return (s) => s + x
}

/**
 * Remove the end of a string, if it exists.
 */
export function unappend_(s: string, x: string): string {
  return s.endsWith(x) ? s.substring(0, s.lastIndexOf(x)) : s
}

/**
 * Remove the end of a string, if it exists.
 *
 * @ets_data_first unappend_
 */
export function unappend(x: string): (s: string) => string {
  return (s) => unappend_(s, x)
}

/**
 * Surround a string. Equivalent to calling `prepend` and `append` with the
 * same outer value.
 */
export function surround_(s: string, x: string): string {
  return pipe(s, prepend(x), append(x))
}

/**
 * Surround a string. Equivalent to calling `prepend` and `append` with the
 * same outer value.
 *
 * @ets_data_first surround_
 */
export function surround(x: string): (s: string) => string {
  return (s) => surround_(s, x)
}

/**
 * Remove the start and end of a string, if they both exist.
 */
export function unsurround_(s: string, x: string): string {
  return s.startsWith(x) && s.endsWith(x) ? pipe(s, unprepend(x), unappend(x)) : s
}

/**
 * Remove the start and end of a string, if they both exist.
 *
 * @ets_data_first unsurround_
 */
export function unsurround(x: string): (s: string) => string {
  return (s) => unsurround_(s, x)
}

/**
 * Returns the substring between the start index (inclusive) and the end index
 * (exclusive).
 */
export function slice_(s: string, start: number, end: number): string {
  return s.slice(start, end)
}

/**
 * Returns the substring between the start index (inclusive) and the end index
 * (exclusive).
 *
 * @ets_data_first slice_
 */
export function slice(start: number, end: number): (s: string) => string {
  return (s) => s.slice(start, end)
}

/**
 * Keep the specified number of characters from the start of a string.
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, an empty string will be returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 */
export function takeLeft_(s: string, n: number): string {
  return s.slice(0, Math.max(n, 0))
}

/**
 * Keep the specified number of characters from the start of a string.
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, an empty string will be returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 *
 * @ets_data_first takeLeft_
 */
export function takeLeft(n: number): (s: string) => string {
  return (s) => takeLeft_(s, n)
}

/**
 * Keep the specified number of characters from the end of a string.
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, an empty string will be returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 */
export function takeRight_(s: string, n: number): string {
  return s.slice(Math.max(0, s.length - Math.floor(n)), Infinity)
}

/**
 * Keep the specified number of characters from the end of a string.
 *
 * If `n` is larger than the available number of characters, the string will
 * be returned whole.
 *
 * If `n` is not a positive number, an empty string will be returned.
 *
 * If `n` is a float, it will be rounded down to the nearest integer.
 *
 * @ets_data_first takeRight_
 */
export function takeRight(n: number): (s: string) => string {
  return (s) => takeRight_(s, n)
}

/**
 * Match a string with a RegExp
 */
export function match_(s: string, r: RegExp): O.Option<RegExpMatchArray> {
  return O.fromNullable(s.match(r))
}

/**
 * Match a string with a RegExp
 *
 * @ets_data_first match_
 */
export function match(r: RegExp): (s: string) => O.Option<RegExpMatchArray> {
  return (s) => match_(s, r)
}

/**
 * Match a string with a global RegExp
 */
export function matchAll_(
  s: string,
  r: RegExp
): O.Option<NA.NonEmptyArray<RegExpMatchArray>> {
  return O.chain_(O.fromNullable(s.matchAll(r)), (x) => pipe(x, A.from, NA.fromArray))
}

/**
 * Matches a string with a global RegExp
 *
 * @ets_data_first matchAll_
 */
export function matchAll(
  r: RegExp
): (s: string) => O.Option<NA.NonEmptyArray<RegExpMatchArray>> {
  return (s) => matchAll_(s, r)
}

/**
 * Split a string into substrings using the specified separator and return them
 * as an array.
 */
export function split_(s: string, on: string | RegExp): A.Array<string> {
  return s.split(on)
}

/**
 * Split a string into substrings using the specified separator and return them
 * as an array.
 *
 * @ets_data_first split_
 */
export function split(on: string | RegExp): (s: string) => A.Array<string> {
  return (s) => s.split(on)
}

/**
 * Apply an endomorphism upon an array of characters against a string.
 * This is useful as it allows you to run many polymorphic functions targeting
 * arrays against strings without having to rewrite them.
 */
export function under_(
  s: string,
  f: (chars: A.Array<string>) => A.Array<string>
): string {
  return pipe(s, split(""), f, A.join(""))
}

/**
 * Apply an endomorphism upon an array of characters against a string.
 * This is useful as it allows you to run many polymorphic functions targeting
 * arrays against strings without having to rewrite them.
 *
 * @ets_data_first under_
 */
export function under(
  f: (chars: A.Array<string>) => A.Array<string>
): (s: string) => string {
  return (s) => under_(s, f)
}

/**
 * Reverse a string
 */
export function reverse(s: string): string {
  return under_(s, A.reverse)
}

/**
 * Split a string into substrings using any recognised newline as the separator.
 */
export function lines(s: string): A.Array<string> {
  return split_(s, /\r\n|\r|\n/)
}

/**
 * Join newline-separated strings together.
 */
export function unlines(as: A.Array<string>): string {
  return A.join_(as, "\n")
}

/**
 * Test a string with a RegExp
 */
export function test_(s: string, r: RegExp): boolean {
  return r.test(s)
}

/**
 * Test a string with a RegExp
 *
 * @ets_data_first test_
 */
export function test(r: RegExp): (s: string) => boolean {
  return (s) => r.test(s)
}

/**
 * Replace the first (or all, with a global RegExp) occurrence of a matched substring with a replacement.
 */
export function replace_(s: string, test: string | RegExp, r: string): string {
  return s.replace(test, r)
}

/**
 * Replace the first (or all, with a global RegExp) occurrence of a matched substring with a replacement.
 *
 * @ets_data_first replace_
 */
export function replace(test: string | RegExp, r: string): (s: string) => string {
  return (s) => s.replace(test, r)
}

export class LinesIterator implements IterableIterator<string> {
  /**
   * Represents the character code of a carriage return character (`"\r"`).
   */
  static CR = 0x0d

  /**
   * Represents the character code of a line-feed character (`"\n"`).
   */
  static LF = 0x0a

  private index: number
  private length: number

  constructor(readonly s: string, readonly stripped: boolean = false) {
    this.index = 0
    this.length = s.length
  }

  next(): IteratorResult<string> {
    if (this.done()) {
      return { done: true, value: undefined }
    }

    const start = this.index

    while (!this.done() && !this.isLineBreak(this.s[this.index]!)) {
      this.index = this.index + 1
    }

    let end = this.index

    if (!this.done()) {
      const char = this.s[this.index]!

      this.index = this.index + 1

      if (!this.done() && this.isLineBreak2(char, this.s[this.index]!)) {
        this.index = this.index + 1
      }

      if (!this.stripped) {
        end = this.index
      }
    }

    return { done: false, value: this.s.substring(start, end) }
  }

  [Symbol.iterator](): IterableIterator<string> {
    return new LinesIterator(this.s, this.stripped)
  }

  private done(): boolean {
    return this.index >= this.length
  }

  /**
   * Test if the provided character is a line break character (i.e. either `"\r"`
   * or `"\n"`).
   */
  private isLineBreak(char: string): boolean {
    const code = char.charCodeAt(0)
    return code === LinesIterator.CR || code === LinesIterator.LF
  }

  /**
   * Test if the provided characters combine to form a carriage return/line-feed
   * (i.e. `"\r\n"`).
   */
  private isLineBreak2(char0: string, char1: string): boolean {
    return (
      char0.charCodeAt(0) === LinesIterator.CR &&
      char1.charCodeAt(0) === LinesIterator.LF
    )
  }
}

function linesSeparated(s: string, stripped: boolean): LinesIterator {
  return new LinesIterator(s, stripped)
}

export function linesIterator(s: string): LinesIterator {
  return linesSeparated(s, true)
}

export function linesWithSeparators(s: string): LinesIterator {
  return linesSeparated(s, false)
}

/**
 * For every line in this string, strip a leading prefix consisting of blanks
 * or control characters followed by the `"|"` character from the line.
 */
export function stripMargin(str: string): string {
  return stripMarginWith_(str, "|")
}

/**
 * For every line in this string, strip a leading prefix consisting of blanks
 * or control characters followed by the `"|"` character from the line.
 */
export function stripMarginWith_(str: string, marginChar: string): string {
  let out = ""

  for (const line of linesWithSeparators(str)) {
    let index = 0

    while (index < line.length && line.charAt(index) <= " ") {
      index += 1
    }

    const stripped =
      index < line.length && line.charAt(index) === marginChar
        ? line.substring(index + 1)
        : line

    out += stripped
  }

  return out
}

/**
 * For every line in this string, strip a leading prefix consisting of blanks
 * or control characters followed by the `"|"` character from the line.
 *
 * @ets_data_first stripMarginWith_
 */
export function stripMarginWith(marginChar: string) {
  return (str: string): string => stripMarginWith_(str, marginChar)
}

/**
 * Converts the string to uppercase
 */
export function toUpperCase(str: string): string {
  return str.toUpperCase()
}
/**
 * Converts the string to uppercase
 */
export function toLowerCase(str: string): string {
  return str.toLowerCase()
}
