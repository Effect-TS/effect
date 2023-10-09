---
title: String.ts
nav_order: 111
parent: Modules
---

## String overview

This module provides utility functions and type class instances for working with the `string` type in TypeScript.
It includes functions for basic string manipulation, as well as type class instances for
`Equivalence` and `Order`.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [guards](#guards)
  - [isString](#isstring)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [utils](#utils)
  - [Concat (type alias)](#concat-type-alias)
  - [Trim (type alias)](#trim-type-alias)
  - [TrimEnd (type alias)](#trimend-type-alias)
  - [TrimStart (type alias)](#trimstart-type-alias)
  - [at](#at)
  - [capitalize](#capitalize)
  - [charAt](#charat)
  - [charCodeAt](#charcodeat)
  - [codePointAt](#codepointat)
  - [concat](#concat)
  - [empty](#empty)
  - [endsWith](#endswith)
  - [includes](#includes)
  - [indexOf](#indexof)
  - [isEmpty](#isempty)
  - [isNonEmpty](#isnonempty)
  - [lastIndexOf](#lastindexof)
  - [length](#length)
  - [linesWithSeparators](#lineswithseparators)
  - [localeCompare](#localecompare)
  - [match](#match)
  - [matchAll](#matchall)
  - [normalize](#normalize)
  - [padEnd](#padend)
  - [padStart](#padstart)
  - [repeat](#repeat)
  - [replace](#replace)
  - [replaceAll](#replaceall)
  - [search](#search)
  - [slice](#slice)
  - [split](#split)
  - [startsWith](#startswith)
  - [stripMargin](#stripmargin)
  - [stripMarginWith](#stripmarginwith)
  - [substring](#substring)
  - [takeLeft](#takeleft)
  - [takeRight](#takeright)
  - [toLocaleLowerCase](#tolocalelowercase)
  - [toLocaleUpperCase](#tolocaleuppercase)
  - [toLowerCase](#tolowercase)
  - [toUpperCase](#touppercase)
  - [trim](#trim)
  - [trimEnd](#trimend)
  - [trimStart](#trimstart)
  - [uncapitalize](#uncapitalize)

---

# guards

## isString

Tests if a value is a `string`.

**Signature**

```ts
export declare const isString: Refinement<unknown, string>
```

**Example**

```ts
import { isString } from 'effect/String'

assert.deepStrictEqual(isString('a'), true)
assert.deepStrictEqual(isString(1), false)
```

Added in v2.0.0

# instances

## Equivalence

**Signature**

```ts
export declare const Equivalence: equivalence.Equivalence<string>
```

Added in v2.0.0

## Order

**Signature**

```ts
export declare const Order: order.Order<string>
```

Added in v2.0.0

# utils

## Concat (type alias)

Concatenates two strings at the type level.

**Signature**

```ts
export type Concat<A extends string, B extends string> = `${A}${B}`
```

Added in v2.0.0

## Trim (type alias)

**Signature**

```ts
export type Trim<A extends string> = TrimEnd<TrimStart<A>>
```

Added in v2.0.0

## TrimEnd (type alias)

**Signature**

```ts
export type TrimEnd<A extends string> = A extends `${infer B} `
  ? TrimEnd<B>
  : A extends `${infer B}\n`
  ? TrimEnd<B>
  : A extends `${infer B}\t`
  ? TrimEnd<B>
  : A extends `${infer B}\r`
  ? TrimEnd<B>
  : A
```

Added in v2.0.0

## TrimStart (type alias)

**Signature**

```ts
export type TrimStart<A extends string> = A extends ` ${infer B}`
  ? TrimStart<B>
  : A extends `\n${infer B}`
  ? TrimStart<B>
  : A extends `\t${infer B}`
  ? TrimStart<B>
  : A extends `\r${infer B}`
  ? TrimStart<B>
  : A
```

Added in v2.0.0

## at

**Signature**

```ts
export declare const at: {
  (index: number): (self: string) => Option.Option<string>
  (self: string, index: number): Option.Option<string>
}
```

**Example**

```ts
import * as S from 'effect/String'
import * as Option from 'effect/Option'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abc', S.at(1)), Option.some('b'))
assert.deepStrictEqual(pipe('abc', S.at(4)), Option.none())
```

Added in v2.0.0

## capitalize

**Signature**

```ts
export declare const capitalize: <T extends string>(self: T) => Capitalize<T>
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abc', S.capitalize), 'Abc')
```

Added in v2.0.0

## charAt

**Signature**

```ts
export declare const charAt: {
  (index: number): (self: string) => Option.Option<string>
  (self: string, index: number): Option.Option<string>
}
```

**Example**

```ts
import * as S from 'effect/String'
import * as Option from 'effect/Option'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abc', S.charAt(1)), Option.some('b'))
assert.deepStrictEqual(pipe('abc', S.charAt(4)), Option.none())
```

Added in v2.0.0

## charCodeAt

**Signature**

```ts
export declare const charCodeAt: {
  (index: number): (self: string) => Option.Option<number>
  (self: string, index: number): Option.Option<number>
}
```

**Example**

```ts
import * as S from 'effect/String'
import * as Option from 'effect/Option'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abc', S.charCodeAt(1)), Option.some(98))
assert.deepStrictEqual(pipe('abc', S.charCodeAt(4)), Option.none())
```

Added in v2.0.0

## codePointAt

**Signature**

```ts
export declare const codePointAt: {
  (index: number): (self: string) => Option.Option<number>
  (self: string, index: number): Option.Option<number>
}
```

**Example**

```ts
import * as S from 'effect/String'
import * as Option from 'effect/Option'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abc', S.codePointAt(1)), Option.some(98))
```

Added in v2.0.0

## concat

Concatenates two strings at runtime.

**Signature**

```ts
export declare const concat: {
  <B extends string>(that: B): <A extends string>(self: A) => `${A}${B}`
  <A extends string, B extends string>(self: A, that: B): `${A}${B}`
}
```

Added in v2.0.0

## empty

The empty string `""`.

**Signature**

```ts
export declare const empty: ''
```

Added in v2.0.0

## endsWith

**Signature**

```ts
export declare const endsWith: (searchString: string, position?: number) => (self: string) => boolean
```

Added in v2.0.0

## includes

Returns `true` if `searchString` appears as a substring of `self`, at one or more positions that are
greater than or equal to `position`; otherwise, returns `false`.

**Signature**

```ts
export declare const includes: (searchString: string, position?: number) => (self: string) => boolean
```

Added in v2.0.0

## indexOf

**Signature**

```ts
export declare const indexOf: (searchString: string) => (self: string) => Option.Option<number>
```

**Example**

```ts
import * as S from 'effect/String'
import * as Option from 'effect/Option'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abbbc', S.indexOf('b')), Option.some(1))
```

Added in v2.0.0

## isEmpty

Test whether a `string` is empty.

**Signature**

```ts
export declare const isEmpty: (self: string) => self is ''
```

**Example**

```ts
import * as S from 'effect/String'

assert.deepStrictEqual(S.isEmpty(''), true)
assert.deepStrictEqual(S.isEmpty('a'), false)
```

Added in v2.0.0

## isNonEmpty

Test whether a `string` is non empty.

**Signature**

```ts
export declare const isNonEmpty: (self: string) => boolean
```

Added in v2.0.0

## lastIndexOf

**Signature**

```ts
export declare const lastIndexOf: (searchString: string) => (self: string) => Option.Option<number>
```

**Example**

```ts
import * as S from 'effect/String'
import * as Option from 'effect/Option'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abbbc', S.lastIndexOf('b')), Option.some(3))
assert.deepStrictEqual(pipe('abbbc', S.lastIndexOf('d')), Option.none())
```

Added in v2.0.0

## length

Calculate the number of characters in a `string`.

**Signature**

```ts
export declare const length: (self: string) => number
```

**Example**

```ts
import * as S from 'effect/String'

assert.deepStrictEqual(S.length('abc'), 3)
```

Added in v2.0.0

## linesWithSeparators

Returns an `IterableIterator` which yields each line contained within the
string as well as the trailing newline character.

**Signature**

```ts
export declare const linesWithSeparators: (s: string) => LinesIterator
```

Added in v2.0.0

## localeCompare

**Signature**

```ts
export declare const localeCompare: (
  that: string,
  locales?: Array<string>,
  options?: Intl.CollatorOptions
) => (self: string) => Ordering.Ordering
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('a', S.localeCompare('b')), -1)
assert.deepStrictEqual(pipe('b', S.localeCompare('a')), 1)
assert.deepStrictEqual(pipe('a', S.localeCompare('a')), 0)
```

Added in v2.0.0

## match

It is the `pipe`-able version of the native `match` method.

**Signature**

```ts
export declare const match: (regexp: RegExp | string) => (self: string) => Option.Option<RegExpMatchArray>
```

Added in v2.0.0

## matchAll

It is the `pipe`-able version of the native `matchAll` method.

**Signature**

```ts
export declare const matchAll: (regexp: RegExp) => (self: string) => IterableIterator<RegExpMatchArray>
```

Added in v2.0.0

## normalize

**Signature**

```ts
export declare const normalize: (form?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD') => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

const str = '\u1E9B\u0323'
assert.deepStrictEqual(pipe(str, S.normalize()), '\u1E9B\u0323')
assert.deepStrictEqual(pipe(str, S.normalize('NFC')), '\u1E9B\u0323')
assert.deepStrictEqual(pipe(str, S.normalize('NFD')), '\u017F\u0323\u0307')
assert.deepStrictEqual(pipe(str, S.normalize('NFKC')), '\u1E69')
assert.deepStrictEqual(pipe(str, S.normalize('NFKD')), '\u0073\u0323\u0307')
```

Added in v2.0.0

## padEnd

**Signature**

```ts
export declare const padEnd: (maxLength: number, fillString?: string) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('a', S.padEnd(5)), 'a    ')
assert.deepStrictEqual(pipe('a', S.padEnd(5, '_')), 'a____')
```

Added in v2.0.0

## padStart

**Signature**

```ts
export declare const padStart: (maxLength: number, fillString?: string) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('a', S.padStart(5)), '    a')
assert.deepStrictEqual(pipe('a', S.padStart(5, '_')), '____a')
```

Added in v2.0.0

## repeat

**Signature**

```ts
export declare const repeat: (count: number) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('a', S.repeat(5)), 'aaaaa')
```

Added in v2.0.0

## replace

**Signature**

```ts
export declare const replace: (searchValue: string | RegExp, replaceValue: string) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abc', S.replace('b', 'd')), 'adc')
```

Added in v2.0.0

## replaceAll

**Signature**

```ts
export declare const replaceAll: (searchValue: string | RegExp, replaceValue: string) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('ababb', S.replaceAll('b', 'c')), 'acacc')
assert.deepStrictEqual(pipe('ababb', S.replaceAll(/ba/g, 'cc')), 'accbb')
```

Added in v2.0.0

## search

**Signature**

```ts
export declare const search: {
  (regexp: RegExp | string): (self: string) => Option.Option<number>
  (self: string, regexp: RegExp | string): Option.Option<number>
}
```

**Example**

```ts
import * as S from 'effect/String'
import * as Option from 'effect/Option'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('ababb', S.search('b')), Option.some(1))
assert.deepStrictEqual(pipe('ababb', S.search(/abb/)), Option.some(2))
assert.deepStrictEqual(pipe('ababb', S.search('d')), Option.none())
```

Added in v2.0.0

## slice

**Signature**

```ts
export declare const slice: (start?: number, end?: number) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abcd', S.slice(1, 3)), 'bc')
```

Added in v2.0.0

## split

**Signature**

```ts
export declare const split: {
  (separator: string | RegExp): (self: string) => [string, ...string[]]
  (self: string, separator: string | RegExp): [string, ...string[]]
}
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abc', S.split('')), ['a', 'b', 'c'])
assert.deepStrictEqual(pipe('', S.split('')), [''])
```

Added in v2.0.0

## startsWith

**Signature**

```ts
export declare const startsWith: (searchString: string, position?: number) => (self: string) => boolean
```

Added in v2.0.0

## stripMargin

For every line in this string, strip a leading prefix consisting of blanks
or control characters followed by the `"|"` character from the line.

**Signature**

```ts
export declare const stripMargin: (self: string) => string
```

Added in v2.0.0

## stripMarginWith

For every line in this string, strip a leading prefix consisting of blanks
or control characters followed by the character specified by `marginChar`
from the line.

**Signature**

```ts
export declare const stripMarginWith: {
  (marginChar: string): (self: string) => string
  (self: string, marginChar: string): string
}
```

Added in v2.0.0

## substring

**Signature**

```ts
export declare const substring: (start: number, end?: number) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('abcd', S.substring(1)), 'bcd')
assert.deepStrictEqual(pipe('abcd', S.substring(1, 3)), 'bc')
```

Added in v2.0.0

## takeLeft

Keep the specified number of characters from the start of a string.

If `n` is larger than the available number of characters, the string will
be returned whole.

If `n` is not a positive number, an empty string will be returned.

If `n` is a float, it will be rounded down to the nearest integer.

**Signature**

```ts
export declare const takeLeft: { (n: number): (self: string) => string; (self: string, n: number): string }
```

**Example**

```ts
import * as S from 'effect/String'

assert.deepStrictEqual(S.takeLeft('Hello World', 5), 'Hello')
```

Added in v2.0.0

## takeRight

Keep the specified number of characters from the end of a string.

If `n` is larger than the available number of characters, the string will
be returned whole.

If `n` is not a positive number, an empty string will be returned.

If `n` is a float, it will be rounded down to the nearest integer.

**Signature**

```ts
export declare const takeRight: { (n: number): (self: string) => string; (self: string, n: number): string }
```

**Example**

```ts
import * as S from 'effect/String'

assert.deepStrictEqual(S.takeRight('Hello World', 5), 'World')
```

Added in v2.0.0

## toLocaleLowerCase

**Signature**

```ts
export declare const toLocaleLowerCase: (locale?: string | Array<string>) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

const str = '\u0130'
assert.deepStrictEqual(pipe(str, S.toLocaleLowerCase('tr')), 'i')
```

Added in v2.0.0

## toLocaleUpperCase

**Signature**

```ts
export declare const toLocaleUpperCase: (locale?: string | Array<string>) => (self: string) => string
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

const str = 'i\u0307'
assert.deepStrictEqual(pipe(str, S.toLocaleUpperCase('lt-LT')), 'I')
```

Added in v2.0.0

## toLowerCase

**Signature**

```ts
export declare const toLowerCase: <T extends string>(self: T) => Lowercase<T>
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('A', S.toLowerCase), 'a')
```

Added in v2.0.0

## toUpperCase

**Signature**

```ts
export declare const toUpperCase: <S extends string>(self: S) => Uppercase<S>
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('a', S.toUpperCase), 'A')
```

Added in v2.0.0

## trim

**Signature**

```ts
export declare const trim: <A extends string>(self: A) => TrimEnd<TrimStart<A>>
```

**Example**

```ts
import * as S from 'effect/String'

assert.deepStrictEqual(S.trim(' a '), 'a')
```

Added in v2.0.0

## trimEnd

**Signature**

```ts
export declare const trimEnd: <A extends string>(self: A) => TrimEnd<A>
```

**Example**

```ts
import * as S from 'effect/String'

assert.deepStrictEqual(S.trimEnd(' a '), ' a')
```

Added in v2.0.0

## trimStart

**Signature**

```ts
export declare const trimStart: <A extends string>(self: A) => TrimStart<A>
```

**Example**

```ts
import * as S from 'effect/String'

assert.deepStrictEqual(S.trimStart(' a '), 'a ')
```

Added in v2.0.0

## uncapitalize

**Signature**

```ts
export declare const uncapitalize: <T extends string>(self: T) => Uncapitalize<T>
```

**Example**

```ts
import * as S from 'effect/String'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe('ABC', S.uncapitalize), 'aBC')
```

Added in v2.0.0
