---
title: Predicate.ts
nav_order: 78
parent: Modules
---

## Predicate overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [and](#and)
  - [eqv](#eqv)
  - [implies](#implies)
  - [mapInput](#mapinput)
  - [nand](#nand)
  - [nor](#nor)
  - [not](#not)
  - [or](#or)
  - [xor](#xor)
- [combining](#combining)
  - [all](#all)
  - [product](#product)
  - [productMany](#productmany)
- [elements](#elements)
  - [every](#every)
  - [some](#some)
- [guards](#guards)
  - [hasProperty](#hasproperty)
  - [isBigInt](#isbigint)
  - [isBoolean](#isboolean)
  - [isDate](#isdate)
  - [isError](#iserror)
  - [isFunction](#isfunction)
  - [isIterable](#isiterable)
  - [isNever](#isnever)
  - [isNotNull](#isnotnull)
  - [isNotNullable](#isnotnullable)
  - [isNotUndefined](#isnotundefined)
  - [isNull](#isnull)
  - [isNullable](#isnullable)
  - [isNumber](#isnumber)
  - [isObject](#isobject)
  - [isReadonlyRecord](#isreadonlyrecord)
  - [isRecord](#isrecord)
  - [isString](#isstring)
  - [isSymbol](#issymbol)
  - [isTagged](#istagged)
  - [isUint8Array](#isuint8array)
  - [isUndefined](#isundefined)
  - [isUnknown](#isunknown)
- [models](#models)
  - [Predicate (interface)](#predicate-interface)
  - [Refinement (interface)](#refinement-interface)
- [type lambdas](#type-lambdas)
  - [PredicateTypeLambda (interface)](#predicatetypelambda-interface)
- [utils](#utils)
  - [compose](#compose)
  - [struct](#struct)
  - [tuple](#tuple)

---

# combinators

## and

Combines two predicates into a new predicate that returns `true` if both of the predicates returns `true`.

**Signature**

```ts
export declare const and: {
  <A, C extends A>(that: Refinement<A, C>): <B extends A>(self: Refinement<A, B>) => Refinement<A, B & C>
  <A, B extends A, C extends A>(self: Refinement<A, B>, that: Refinement<A, C>): Refinement<A, B & C>
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
}
```

**Example**

```ts
import * as P from "effect/Predicate"

const minLength = (n: number) => (s: string) => s.length >= n
const maxLength = (n: number) => (s: string) => s.length <= n

const length = (n: number) => P.and(minLength(n), maxLength(n))

assert.deepStrictEqual(length(2)("aa"), true)
assert.deepStrictEqual(length(2)("a"), false)
assert.deepStrictEqual(length(2)("aaa"), false)
```

Added in v2.0.0

## eqv

**Signature**

```ts
export declare const eqv: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
}
```

Added in v2.0.0

## implies

**Signature**

```ts
export declare const implies: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
}
```

Added in v2.0.0

## mapInput

Given a `Predicate<A>` returns a `Predicate<B>`

**Signature**

```ts
export declare const mapInput: {
  <B, A>(f: (b: B) => A): (self: Predicate<A>) => Predicate<B>
  <A, B>(self: Predicate<A>, f: (b: B) => A): Predicate<B>
}
```

**Example**

```ts
import * as P from "effect/Predicate"
import * as N from "effect/Number"

const minLength3 = P.mapInput(N.greaterThan(2), (s: string) => s.length)

assert.deepStrictEqual(minLength3("a"), false)
assert.deepStrictEqual(minLength3("aa"), false)
assert.deepStrictEqual(minLength3("aaa"), true)
assert.deepStrictEqual(minLength3("aaaa"), true)
```

Added in v2.0.0

## nand

**Signature**

```ts
export declare const nand: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
}
```

Added in v2.0.0

## nor

**Signature**

```ts
export declare const nor: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
}
```

Added in v2.0.0

## not

Negates the result of a given predicate.

**Signature**

```ts
export declare const not: <A>(self: Predicate<A>) => Predicate<A>
```

**Example**

```ts
import * as P from "effect/Predicate"
import * as N from "effect/Number"

const isPositive = P.not(N.lessThan(0))

assert.deepStrictEqual(isPositive(-1), false)
assert.deepStrictEqual(isPositive(0), true)
assert.deepStrictEqual(isPositive(1), true)
```

Added in v2.0.0

## or

Combines two predicates into a new predicate that returns `true` if at least one of the predicates returns `true`.

**Signature**

```ts
export declare const or: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
}
```

**Example**

```ts
import * as P from "effect/Predicate"
import * as N from "effect/Number"

const nonZero = P.or(N.lessThan(0), N.greaterThan(0))

assert.deepStrictEqual(nonZero(-1), true)
assert.deepStrictEqual(nonZero(0), false)
assert.deepStrictEqual(nonZero(1), true)
```

Added in v2.0.0

## xor

**Signature**

```ts
export declare const xor: {
  <A>(that: Predicate<A>): (self: Predicate<A>) => Predicate<A>
  <A>(self: Predicate<A>, that: Predicate<A>): Predicate<A>
}
```

Added in v2.0.0

# combining

## all

**Signature**

```ts
export declare const all: <A>(collection: Iterable<Predicate<A>>) => Predicate<readonly A[]>
```

Added in v2.0.0

## product

**Signature**

```ts
export declare const product: <A, B>(self: Predicate<A>, that: Predicate<B>) => Predicate<readonly [A, B]>
```

Added in v2.0.0

## productMany

**Signature**

```ts
export declare const productMany: <A>(
  self: Predicate<A>,
  collection: Iterable<Predicate<A>>
) => Predicate<readonly [A, ...A[]]>
```

Added in v2.0.0

# elements

## every

**Signature**

```ts
export declare const every: <A>(collection: Iterable<Predicate<A>>) => Predicate<A>
```

Added in v2.0.0

## some

**Signature**

```ts
export declare const some: <A>(collection: Iterable<Predicate<A>>) => Predicate<A>
```

Added in v2.0.0

# guards

## hasProperty

Checks whether a value is an `object` containing a specified property key.

**Signature**

```ts
export declare const hasProperty: {
  <P extends PropertyKey>(property: P): (self: unknown) => self is { [K in P]: unknown }
  <P extends PropertyKey>(self: unknown, property: P): self is { [K in P]: unknown }
}
```

Added in v2.0.0

## isBigInt

Tests if a value is a `bigint`.

**Signature**

```ts
export declare const isBigInt: (input: unknown) => input is bigint
```

**Example**

```ts
import { isBigInt } from "effect/Predicate"

assert.deepStrictEqual(isBigInt(1n), true)

assert.deepStrictEqual(isBigInt(1), false)
```

Added in v2.0.0

## isBoolean

Tests if a value is a `boolean`.

**Signature**

```ts
export declare const isBoolean: (input: unknown) => input is boolean
```

**Example**

```ts
import { isBoolean } from "effect/Predicate"

assert.deepStrictEqual(isBoolean(true), true)

assert.deepStrictEqual(isBoolean("true"), false)
```

Added in v2.0.0

## isDate

A guard that succeeds when the input is a `Date`.

**Signature**

```ts
export declare const isDate: (input: unknown) => input is Date
```

**Example**

```ts
import { isDate } from "effect/Predicate"

assert.deepStrictEqual(isDate(new Date()), true)

assert.deepStrictEqual(isDate(null), false)
assert.deepStrictEqual(isDate({}), false)
```

Added in v2.0.0

## isError

A guard that succeeds when the input is an `Error`.

**Signature**

```ts
export declare const isError: (input: unknown) => input is Error
```

**Example**

```ts
import { isError } from "effect/Predicate"

assert.deepStrictEqual(isError(new Error()), true)

assert.deepStrictEqual(isError(null), false)
assert.deepStrictEqual(isError({}), false)
```

Added in v2.0.0

## isFunction

Tests if a value is a `function`.

**Signature**

```ts
export declare const isFunction: (input: unknown) => input is Function
```

**Example**

```ts
import { isFunction } from "effect/Predicate"

assert.deepStrictEqual(isFunction(isFunction), true)

assert.deepStrictEqual(isFunction("function"), false)
```

Added in v2.0.0

## isIterable

A guard that succeeds when the input is an `Iterable`.

**Signature**

```ts
export declare const isIterable: (input: unknown) => input is Iterable<unknown>
```

**Example**

```ts
import { isIterable } from "effect/Predicate"

assert.deepStrictEqual(isIterable([]), true)
assert.deepStrictEqual(isIterable(new Set()), true)

assert.deepStrictEqual(isIterable(null), false)
assert.deepStrictEqual(isIterable({}), false)
```

Added in v2.0.0

## isNever

A guard that always fails.

**Signature**

```ts
export declare const isNever: (input: unknown) => input is never
```

**Example**

```ts
import { isNever } from "effect/Predicate"

assert.deepStrictEqual(isNever(null), false)
assert.deepStrictEqual(isNever(undefined), false)
assert.deepStrictEqual(isNever({}), false)
assert.deepStrictEqual(isNever([]), false)
```

Added in v2.0.0

## isNotNull

Tests if a value is not `undefined`.

**Signature**

```ts
export declare const isNotNull: <A>(input: A) => input is Exclude<A, null>
```

**Example**

```ts
import { isNotNull } from "effect/Predicate"

assert.deepStrictEqual(isNotNull(undefined), true)
assert.deepStrictEqual(isNotNull("null"), true)

assert.deepStrictEqual(isNotNull(null), false)
```

Added in v2.0.0

## isNotNullable

A guard that succeeds when the input is not `null` or `undefined`.

**Signature**

```ts
export declare const isNotNullable: <A>(input: A) => input is NonNullable<A>
```

**Example**

```ts
import { isNotNullable } from "effect/Predicate"

assert.deepStrictEqual(isNotNullable({}), true)
assert.deepStrictEqual(isNotNullable([]), true)

assert.deepStrictEqual(isNotNullable(null), false)
assert.deepStrictEqual(isNotNullable(undefined), false)
```

Added in v2.0.0

## isNotUndefined

Tests if a value is not `undefined`.

**Signature**

```ts
export declare const isNotUndefined: <A>(input: A) => input is Exclude<A, undefined>
```

**Example**

```ts
import { isNotUndefined } from "effect/Predicate"

assert.deepStrictEqual(isNotUndefined(null), true)
assert.deepStrictEqual(isNotUndefined("undefined"), true)

assert.deepStrictEqual(isNotUndefined(undefined), false)
```

Added in v2.0.0

## isNull

Tests if a value is `undefined`.

**Signature**

```ts
export declare const isNull: (input: unknown) => input is null
```

**Example**

```ts
import { isNull } from "effect/Predicate"

assert.deepStrictEqual(isNull(null), true)

assert.deepStrictEqual(isNull(undefined), false)
assert.deepStrictEqual(isNull("null"), false)
```

Added in v2.0.0

## isNullable

A guard that succeeds when the input is `null` or `undefined`.

**Signature**

```ts
export declare const isNullable: <A>(input: A) => input is Extract<A, null | undefined>
```

**Example**

```ts
import { isNullable } from "effect/Predicate"

assert.deepStrictEqual(isNullable(null), true)
assert.deepStrictEqual(isNullable(undefined), true)

assert.deepStrictEqual(isNullable({}), false)
assert.deepStrictEqual(isNullable([]), false)
```

Added in v2.0.0

## isNumber

Tests if a value is a `number`.

**Signature**

```ts
export declare const isNumber: (input: unknown) => input is number
```

**Example**

```ts
import { isNumber } from "effect/Predicate"

assert.deepStrictEqual(isNumber(2), true)

assert.deepStrictEqual(isNumber("2"), false)
```

Added in v2.0.0

## isObject

Tests if a value is an `object`.

**Signature**

```ts
export declare const isObject: (input: unknown) => input is object
```

**Example**

```ts
import { isObject } from "effect/Predicate"

assert.deepStrictEqual(isObject({}), true)
assert.deepStrictEqual(isObject([]), true)

assert.deepStrictEqual(isObject(null), false)
assert.deepStrictEqual(isObject(undefined), false)
```

Added in v2.0.0

## isReadonlyRecord

A guard that succeeds when the input is a readonly record.

**Signature**

```ts
export declare const isReadonlyRecord: (
  input: unknown
) => input is { readonly [x: string]: unknown; readonly [x: symbol]: unknown }
```

**Example**

```ts
import { isReadonlyRecord } from "effect/Predicate"

assert.deepStrictEqual(isReadonlyRecord({}), true)
assert.deepStrictEqual(isReadonlyRecord({ a: 1 }), true)

assert.deepStrictEqual(isReadonlyRecord([]), false)
assert.deepStrictEqual(isReadonlyRecord([1, 2, 3]), false)
assert.deepStrictEqual(isReadonlyRecord(null), false)
assert.deepStrictEqual(isReadonlyRecord(undefined), false)
```

Added in v2.0.0

## isRecord

A guard that succeeds when the input is a record.

**Signature**

```ts
export declare const isRecord: (input: unknown) => input is { [x: string]: unknown; [x: symbol]: unknown }
```

**Example**

```ts
import { isRecord } from "effect/Predicate"

assert.deepStrictEqual(isRecord({}), true)
assert.deepStrictEqual(isRecord({ a: 1 }), true)

assert.deepStrictEqual(isRecord([]), false)
assert.deepStrictEqual(isRecord([1, 2, 3]), false)
assert.deepStrictEqual(isRecord(null), false)
assert.deepStrictEqual(isRecord(undefined), false)
assert.deepStrictEqual(
  isRecord(() => null),
  false
)
```

Added in v2.0.0

## isString

Tests if a value is a `string`.

**Signature**

```ts
export declare const isString: (input: unknown) => input is string
```

**Example**

```ts
import { isString } from "effect/Predicate"

assert.deepStrictEqual(isString("a"), true)

assert.deepStrictEqual(isString(1), false)
```

Added in v2.0.0

## isSymbol

Tests if a value is a `symbol`.

**Signature**

```ts
export declare const isSymbol: (input: unknown) => input is symbol
```

**Example**

```ts
import { isSymbol } from "effect/Predicate"

assert.deepStrictEqual(isSymbol(Symbol.for("a")), true)

assert.deepStrictEqual(isSymbol("a"), false)
```

Added in v2.0.0

## isTagged

Tests if a value is an `object` with a property `_tag` that matches the given tag.

**Signature**

```ts
export declare const isTagged: {
  <K extends string>(tag: K): (self: unknown) => self is { _tag: K }
  <K extends string>(self: unknown, tag: K): self is { _tag: K }
}
```

**Example**

```ts
import { isTagged } from "effect/Predicate"

assert.deepStrictEqual(isTagged(1, "a"), false)
assert.deepStrictEqual(isTagged(null, "a"), false)
assert.deepStrictEqual(isTagged({}, "a"), false)
assert.deepStrictEqual(isTagged({ a: "a" }, "a"), false)
assert.deepStrictEqual(isTagged({ _tag: "a" }, "a"), true)
assert.deepStrictEqual(isTagged("a")({ _tag: "a" }), true)
```

Added in v2.0.0

## isUint8Array

A guard that succeeds when the input is a `Uint8Array`.

**Signature**

```ts
export declare const isUint8Array: (input: unknown) => input is Uint8Array
```

**Example**

```ts
import { isUint8Array } from "effect/Predicate"

assert.deepStrictEqual(isUint8Array(new Uint8Array()), true)

assert.deepStrictEqual(isUint8Array(null), false)
assert.deepStrictEqual(isUint8Array({}), false)
```

Added in v2.0.0

## isUndefined

Tests if a value is `undefined`.

**Signature**

```ts
export declare const isUndefined: (input: unknown) => input is undefined
```

**Example**

```ts
import { isUndefined } from "effect/Predicate"

assert.deepStrictEqual(isUndefined(undefined), true)

assert.deepStrictEqual(isUndefined(null), false)
assert.deepStrictEqual(isUndefined("undefined"), false)
```

Added in v2.0.0

## isUnknown

A guard that always succeeds.

**Signature**

```ts
export declare const isUnknown: (input: unknown) => input is unknown
```

**Example**

```ts
import { isUnknown } from "effect/Predicate"

assert.deepStrictEqual(isUnknown(null), true)
assert.deepStrictEqual(isUnknown(undefined), true)

assert.deepStrictEqual(isUnknown({}), true)
assert.deepStrictEqual(isUnknown([]), true)
```

Added in v2.0.0

# models

## Predicate (interface)

**Signature**

```ts
export interface Predicate<A> {
  (a: A): boolean
}
```

Added in v2.0.0

## Refinement (interface)

**Signature**

```ts
export interface Refinement<A, B extends A> {
  (a: A): a is B
}
```

Added in v2.0.0

# type lambdas

## PredicateTypeLambda (interface)

**Signature**

```ts
export interface PredicateTypeLambda extends TypeLambda {
  readonly type: Predicate<this["Target"]>
}
```

Added in v2.0.0

# utils

## compose

**Signature**

```ts
export declare const compose: {
  <A, B extends A, C extends B>(bc: Refinement<B, C>): (ab: Refinement<A, B>) => Refinement<A, C>
  <A, B extends A, C extends B>(ab: Refinement<A, B>, bc: Refinement<B, C>): Refinement<A, C>
}
```

Added in v2.0.0

## struct

**Signature**

```ts
export declare const struct: <R extends Record<string, Predicate<any>>>(
  fields: R
) => Predicate<{ readonly [K in keyof R]: [R[K]] extends [Predicate<infer A>] ? A : never }>
```

Added in v2.0.0

## tuple

Similar to `Promise.all` but operates on `Predicate`s.

```
[Predicate<A>, Predicate<B>, ...] -> Predicate<[A, B, ...]>
```

**Signature**

```ts
export declare const tuple: <T extends readonly Predicate<any>[]>(
  ...elements: T
) => Predicate<Readonly<{ [I in keyof T]: [T[I]] extends [Predicate<infer A>] ? A : never }>>
```

Added in v2.0.0
