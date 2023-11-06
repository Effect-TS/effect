/**
 * This module provides utility functions and type class instances for working with the `string` type in TypeScript.
 * It includes functions for basic string manipulation, as well as type class instances for
 * `Equivalence` and `Order`.
 *
 * @since 2.0.0
 */

import * as equivalence from "./Equivalence.js"
import { dual } from "./Function.js"
import * as readonlyArray from "./internal/readonlyArray.js"
import * as number from "./Number.js"
import * as Option from "./Option.js"
import * as order from "./Order.js"
import type * as Ordering from "./Ordering.js"
import type { Refinement } from "./Predicate.js"
import * as predicate from "./Predicate.js"
import type { NonEmptyArray } from "./ReadonlyArray.js"

/**
 * Tests if a value is a `string`.
 *
 * @param input - The value to test.
 *
 * @example
 * import { isString } from 'effect/String'
 *
 * assert.deepStrictEqual(isString("a"), true)
 * assert.deepStrictEqual(isString(1), false)
 *
 * @category guards
 * @since 2.0.0
 */
export const isString: Refinement<unknown, string> = predicate.isString

/**
 * @category instances
 * @since 2.0.0
 */
export const Equivalence: equivalence.Equivalence<string> = equivalence.string

/**
 * @category instances
 * @since 2.0.0
 */
export const Order: order.Order<string> = order.string

/**
 * The empty string `""`.
 *
 * @since 2.0.0
 */
export const empty: "" = "" as const

/**
 * Concatenates two strings at the type level.
 *
 * @since 2.0.0
 */
export type Concat<A extends string, B extends string> = `${A}${B}`

/**
 * Concatenates two strings at runtime.
 *
 * @since 2.0.0
 */
export const concat: {
  <B extends string>(that: B): <A extends string>(self: A) => Concat<A, B>
  <A extends string, B extends string>(self: A, that: B): Concat<A, B>
} = dual(2, (self: string, that: string): string => self + that)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe('a', S.toUpperCase), 'A')
 *
 * @since 2.0.0
 */
export const toUpperCase = <S extends string>(self: S): Uppercase<S> => self.toUpperCase() as Uppercase<S>

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe('A', S.toLowerCase), 'a')
 *
 * @since 2.0.0
 */
export const toLowerCase = <T extends string>(self: T): Lowercase<T> => self.toLowerCase() as Lowercase<T>

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe('abc', S.capitalize), 'Abc')
 *
 * @since 2.0.0
 */
export const capitalize = <T extends string>(self: T): Capitalize<T> => {
  if (self.length === 0) return self as Capitalize<T>

  return (toUpperCase(self[0]) + self.slice(1)) as Capitalize<T>
}

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe('ABC', S.uncapitalize), 'aBC')
 *
 * @since 2.0.0
 */
export const uncapitalize = <T extends string>(self: T): Uncapitalize<T> => {
  if (self.length === 0) return self as Uncapitalize<T>

  return (toLowerCase(self[0]) + self.slice(1)) as Uncapitalize<T>
}

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe('abc', S.replace('b', 'd')), 'adc')
 *
 * @since 2.0.0
 */
export const replace = (searchValue: string | RegExp, replaceValue: string) => (self: string): string =>
  self.replace(searchValue, replaceValue)

/**
 * @since 2.0.0
 */
export type Trim<A extends string> = TrimEnd<TrimStart<A>>

/**
 * @example
 * import * as S from 'effect/String'
 *
 * assert.deepStrictEqual(S.trim(' a '), 'a')
 *
 * @since 2.0.0
 */
export const trim = <A extends string>(self: A): Trim<A> => self.trim() as Trim<A>

/**
 * @since 2.0.0
 */
export type TrimStart<A extends string> = A extends ` ${infer B}` ? TrimStart<B>
  : A extends `\n${infer B}` ? TrimStart<B>
  : A extends `\t${infer B}` ? TrimStart<B>
  : A extends `\r${infer B}` ? TrimStart<B>
  : A

/**
 * @example
 * import * as S from 'effect/String'
 *
 * assert.deepStrictEqual(S.trimStart(' a '), 'a ')
 *
 * @since 2.0.0
 */
export const trimStart = <A extends string>(self: A): TrimStart<A> => self.trimStart() as TrimStart<A>

/**
 * @since 2.0.0
 */
export type TrimEnd<A extends string> = A extends `${infer B} ` ? TrimEnd<B>
  : A extends `${infer B}\n` ? TrimEnd<B>
  : A extends `${infer B}\t` ? TrimEnd<B>
  : A extends `${infer B}\r` ? TrimEnd<B>
  : A

/**
 * @example
 * import * as S from 'effect/String'
 *
 * assert.deepStrictEqual(S.trimEnd(' a '), ' a')
 *
 * @since 2.0.0
 */
export const trimEnd = <A extends string>(self: A): TrimEnd<A> => self.trimEnd() as TrimEnd<A>

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe('abcd', S.slice(1, 3)), 'bc')
 *
 * @since 2.0.0
 */
export const slice = (start?: number, end?: number) => (self: string): string => self.slice(start, end)

/**
 * Test whether a `string` is empty.
 *
 * @example
 * import * as S from 'effect/String'
 *
 * assert.deepStrictEqual(S.isEmpty(''), true)
 * assert.deepStrictEqual(S.isEmpty('a'), false)
 *
 * @since 2.0.0
 */
export const isEmpty = (self: string): self is "" => self.length === 0

/**
 * Test whether a `string` is non empty.
 *
 * @since 2.0.0
 */
export const isNonEmpty = (self: string): boolean => self.length > 0

/**
 * Calculate the number of characters in a `string`.
 *
 * @example
 * import * as S from 'effect/String'
 *
 * assert.deepStrictEqual(S.length('abc'), 3)
 *
 * @since 2.0.0
 */
export const length = (self: string): number => self.length

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe('abc', S.split('')), ['a', 'b', 'c'])
 * assert.deepStrictEqual(pipe('', S.split('')), [''])
 *
 * @since 2.0.0
 */
export const split: {
  (separator: string | RegExp): (self: string) => NonEmptyArray<string>
  (self: string, separator: string | RegExp): NonEmptyArray<string>
} = dual(2, (self: string, separator: string | RegExp): NonEmptyArray<string> => {
  const out = self.split(separator)
  return readonlyArray.isNonEmptyArray(out) ? out : [self]
})

/**
 * Returns `true` if `searchString` appears as a substring of `self`, at one or more positions that are
 * greater than or equal to `position`; otherwise, returns `false`.
 *
 * @since 2.0.0
 */
export const includes = (searchString: string, position?: number) => (self: string): boolean =>
  self.includes(searchString, position)

/**
 * @since 2.0.0
 */
export const startsWith = (searchString: string, position?: number) => (self: string): boolean =>
  self.startsWith(searchString, position)

/**
 * @since 2.0.0
 */
export const endsWith = (searchString: string, position?: number) => (self: string): boolean =>
  self.endsWith(searchString, position)

/**
 * @example
 * import * as S from 'effect/String'
 * import * as Option from 'effect/Option'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("abc", S.charCodeAt(1)), Option.some(98))
 * assert.deepStrictEqual(pipe("abc", S.charCodeAt(4)), Option.none())
 *
 * @since 2.0.0
 */
export const charCodeAt: {
  (index: number): (self: string) => Option.Option<number>
  (self: string, index: number): Option.Option<number>
} = dual(
  2,
  (self: string, index: number): Option.Option<number> =>
    Option.filter(Option.some(self.charCodeAt(index)), (charCode) => !isNaN(charCode))
)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("abcd", S.substring(1)), "bcd")
 * assert.deepStrictEqual(pipe("abcd", S.substring(1, 3)), "bc")
 *
 * @since 2.0.0
 */
export const substring = (start: number, end?: number) => (self: string): string => self.substring(start, end)

/**
 * @example
 * import * as S from 'effect/String'
 * import * as Option from 'effect/Option'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("abc", S.at(1)), Option.some("b"))
 * assert.deepStrictEqual(pipe("abc", S.at(4)), Option.none())
 *
 * @since 2.0.0
 */
export const at: {
  (index: number): (self: string) => Option.Option<string>
  (self: string, index: number): Option.Option<string>
} = dual(2, (self: string, index: number): Option.Option<string> => Option.fromNullable(self.at(index)))

/**
 * @example
 * import * as S from 'effect/String'
 * import * as Option from 'effect/Option'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("abc", S.charAt(1)), Option.some("b"))
 * assert.deepStrictEqual(pipe("abc", S.charAt(4)), Option.none())
 *
 * @since 2.0.0
 */
export const charAt: {
  (index: number): (self: string) => Option.Option<string>
  (self: string, index: number): Option.Option<string>
} = dual(
  2,
  (self: string, index: number): Option.Option<string> => Option.filter(Option.some(self.charAt(index)), isNonEmpty)
)

/**
 * @example
 * import * as S from 'effect/String'
 * import * as Option from 'effect/Option'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("abc", S.codePointAt(1)), Option.some(98))
 *
 * @since 2.0.0
 */
export const codePointAt: {
  (index: number): (self: string) => Option.Option<number>
  (self: string, index: number): Option.Option<number>
} = dual(2, (self: string, index: number): Option.Option<number> => Option.fromNullable(self.codePointAt(index)))

/**
 * @example
 * import * as S from 'effect/String'
 * import * as Option from 'effect/Option'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("abbbc", S.indexOf("b")), Option.some(1))
 *
 * @since 2.0.0
 */
export const indexOf = (searchString: string) => (self: string): Option.Option<number> =>
  Option.filter(Option.some(self.indexOf(searchString)), number.greaterThanOrEqualTo(0))

/**
 * @example
 * import * as S from 'effect/String'
 * import * as Option from 'effect/Option'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("abbbc", S.lastIndexOf("b")), Option.some(3))
 * assert.deepStrictEqual(pipe("abbbc", S.lastIndexOf("d")), Option.none())
 *
 * @since 2.0.0
 */
export const lastIndexOf = (searchString: string) => (self: string): Option.Option<number> =>
  Option.filter(Option.some(self.lastIndexOf(searchString)), number.greaterThanOrEqualTo(0))

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("a", S.localeCompare("b")), -1)
 * assert.deepStrictEqual(pipe("b", S.localeCompare("a")), 1)
 * assert.deepStrictEqual(pipe("a", S.localeCompare("a")), 0)
 *
 * @since 2.0.0
 */
export const localeCompare =
  (that: string, locales?: Array<string>, options?: Intl.CollatorOptions) => (self: string): Ordering.Ordering =>
    number.sign(self.localeCompare(that, locales, options))

/**
 * It is the `pipe`-able version of the native `match` method.
 *
 * @since 2.0.0
 */
export const match = (regexp: RegExp | string) => (self: string): Option.Option<RegExpMatchArray> =>
  Option.fromNullable(self.match(regexp))

/**
 * It is the `pipe`-able version of the native `matchAll` method.
 *
 * @since 2.0.0
 */
export const matchAll = (regexp: RegExp) => (self: string): IterableIterator<RegExpMatchArray> => self.matchAll(regexp)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * const str = "\u1E9B\u0323";
 * assert.deepStrictEqual(pipe(str, S.normalize()), "\u1E9B\u0323")
 * assert.deepStrictEqual(pipe(str, S.normalize("NFC")), "\u1E9B\u0323")
 * assert.deepStrictEqual(pipe(str, S.normalize("NFD")), "\u017F\u0323\u0307")
 * assert.deepStrictEqual(pipe(str, S.normalize("NFKC")), "\u1E69")
 * assert.deepStrictEqual(pipe(str, S.normalize("NFKD")), "\u0073\u0323\u0307")
 *
 * @since 2.0.0
 */
export const normalize = (form?: "NFC" | "NFD" | "NFKC" | "NFKD") => (self: string): string => self.normalize(form)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("a", S.padEnd(5)), "a    ")
 * assert.deepStrictEqual(pipe("a", S.padEnd(5, "_")), "a____")
 *
 * @since 2.0.0
 */
export const padEnd = (maxLength: number, fillString?: string) => (self: string): string =>
  self.padEnd(maxLength, fillString)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("a", S.padStart(5)), "    a")
 * assert.deepStrictEqual(pipe("a", S.padStart(5, "_")), "____a")
 *
 * @since 2.0.0
 */
export const padStart = (maxLength: number, fillString?: string) => (self: string): string =>
  self.padStart(maxLength, fillString)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("a", S.repeat(5)), "aaaaa")
 *
 * @since 2.0.0
 */
export const repeat = (count: number) => (self: string): string => self.repeat(count)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("ababb", S.replaceAll("b", "c")), "acacc")
 * assert.deepStrictEqual(pipe("ababb", S.replaceAll(/ba/g, "cc")), "accbb")
 *
 * @since 2.0.0
 */
export const replaceAll = (searchValue: string | RegExp, replaceValue: string) => (self: string): string =>
  self.replaceAll(searchValue, replaceValue)

/**
 * @example
 * import * as S from 'effect/String'
 * import * as Option from 'effect/Option'
 * import { pipe } from 'effect/Function'
 *
 * assert.deepStrictEqual(pipe("ababb", S.search("b")), Option.some(1))
 * assert.deepStrictEqual(pipe("ababb", S.search(/abb/)), Option.some(2))
 * assert.deepStrictEqual(pipe("ababb", S.search("d")), Option.none())
 *
 * @since 2.0.0
 */
export const search: {
  (regexp: RegExp | string): (self: string) => Option.Option<number>
  (self: string, regexp: RegExp | string): Option.Option<number>
} = dual(
  2,
  (self: string, regexp: RegExp | string): Option.Option<number> =>
    Option.filter(Option.some(self.search(regexp)), number.greaterThanOrEqualTo(0))
)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * const str = "\u0130"
 * assert.deepStrictEqual(pipe(str, S.toLocaleLowerCase("tr")), "i")
 *
 * @since 2.0.0
 */
export const toLocaleLowerCase = (locale?: string | Array<string>) => (self: string): string =>
  self.toLocaleLowerCase(locale)

/**
 * @example
 * import * as S from 'effect/String'
 * import { pipe } from 'effect/Function'
 *
 * const str = "i\u0307"
 * assert.deepStrictEqual(pipe(str, S.toLocaleUpperCase("lt-LT")), "I")
 *
 * @since 2.0.0
 */
export const toLocaleUpperCase = (locale?: string | Array<string>) => (self: string): string =>
  self.toLocaleUpperCase(locale)

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
 * @example
 * import * as S from 'effect/String'
 *
 * assert.deepStrictEqual(S.takeLeft("Hello World", 5), "Hello")
 *
 * @since 2.0.0
 */
export const takeLeft: {
  (n: number): (self: string) => string
  (self: string, n: number): string
} = dual(2, (self: string, n: number): string => self.slice(0, Math.max(n, 0)))

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
 * @example
 * import * as S from 'effect/String'
 *
 * assert.deepStrictEqual(S.takeRight("Hello World", 5), "World")
 *
 * @since 2.0.0
 */
export const takeRight: {
  (n: number): (self: string) => string
  (self: string, n: number): string
} = dual(
  2,
  (self: string, n: number): string => self.slice(Math.max(0, self.length - Math.floor(n)), Infinity)
)

const CR = 0x0d
const LF = 0x0a

/**
 * Returns an `IterableIterator` which yields each line contained within the
 * string, trimming off the trailing newline character.
 *
 * @since 2.0.0
 */
// export const linesIterator = (self: string): LinesIterator => linesSeparated(self, true)

/**
 * Returns an `IterableIterator` which yields each line contained within the
 * string as well as the trailing newline character.
 *
 * @since 2.0.0
 */
export const linesWithSeparators = (s: string): LinesIterator => linesSeparated(s, false)

/**
 * For every line in this string, strip a leading prefix consisting of blanks
 * or control characters followed by the character specified by `marginChar`
 * from the line.
 *
 * @since 2.0.0
 */
export const stripMarginWith: {
  (marginChar: string): (self: string) => string
  (self: string, marginChar: string): string
} = dual(2, (self: string, marginChar: string): string => {
  let out = ""

  for (const line of linesWithSeparators(self)) {
    let index = 0

    while (index < line.length && line.charAt(index) <= " ") {
      index = index + 1
    }

    const stripped = index < line.length && line.charAt(index) === marginChar
      ? line.substring(index + 1)
      : line

    out = out + stripped
  }

  return out
})

/**
 * For every line in this string, strip a leading prefix consisting of blanks
 * or control characters followed by the `"|"` character from the line.
 *
 * @since 2.0.0
 */
export const stripMargin = (self: string): string => stripMarginWith(self, "|")

class LinesIterator implements IterableIterator<string> {
  private index: number
  private readonly length: number

  constructor(readonly s: string, readonly stripped: boolean = false) {
    this.index = 0
    this.length = s.length
  }

  next(): IteratorResult<string> {
    if (this.done) {
      return { done: true, value: undefined }
    }
    const start = this.index
    while (!this.done && !isLineBreak(this.s[this.index]!)) {
      this.index = this.index + 1
    }
    let end = this.index
    if (!this.done) {
      const char = this.s[this.index]!
      this.index = this.index + 1
      if (!this.done && isLineBreak2(char, this.s[this.index]!)) {
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

  private get done(): boolean {
    return this.index >= this.length
  }
}

/**
 * Test if the provided character is a line break character (i.e. either `"\r"`
 * or `"\n"`).
 */
const isLineBreak = (char: string): boolean => {
  const code = char.charCodeAt(0)
  return code === CR || code === LF
}

/**
 * Test if the provided characters combine to form a carriage return/line-feed
 * (i.e. `"\r\n"`).
 */
const isLineBreak2 = (char0: string, char1: string): boolean => char0.charCodeAt(0) === CR && char1.charCodeAt(0) === LF

const linesSeparated = (self: string, stripped: boolean): LinesIterator => new LinesIterator(self, stripped)
