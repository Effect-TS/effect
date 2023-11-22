---
title: Option.ts
nav_order: 73
parent: Modules
---

## Option overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combining](#combining)
  - [all](#all)
  - [ap](#ap)
  - [product](#product)
  - [productMany](#productmany)
  - [zipWith](#zipwith)
- [constructors](#constructors)
  - [none](#none)
  - [some](#some)
- [conversions](#conversions)
  - [fromIterable](#fromiterable)
  - [fromNullable](#fromnullable)
  - [getLeft](#getleft)
  - [getOrThrow](#getorthrow)
  - [getOrThrowWith](#getorthrowwith)
  - [getRight](#getright)
  - [liftNullable](#liftnullable)
  - [liftThrowable](#liftthrowable)
  - [toArray](#toarray)
  - [toRefinement](#torefinement)
- [do notation](#do-notation)
  - [Do](#do)
  - [bind](#bind)
  - [bindTo](#bindto)
  - [let](#let)
- [elements](#elements)
  - [contains](#contains)
  - [containsWith](#containswith)
- [equivalence](#equivalence)
  - [getEquivalence](#getequivalence)
- [error handling](#error-handling)
  - [firstSomeOf](#firstsomeof)
  - [orElse](#orelse)
  - [orElseEither](#orelseeither)
- [filtering](#filtering)
  - [filter](#filter)
  - [filterMap](#filtermap)
  - [partitionMap](#partitionmap)
- [folding](#folding)
  - [reduceCompact](#reducecompact)
- [generators](#generators)
  - [gen](#gen)
- [getters](#getters)
  - [getOrElse](#getorelse)
  - [getOrNull](#getornull)
  - [getOrUndefined](#getorundefined)
- [guards](#guards)
  - [isNone](#isnone)
  - [isOption](#isoption)
  - [isSome](#issome)
- [lifting](#lifting)
  - [lift2](#lift2)
  - [liftPredicate](#liftpredicate)
- [models](#models)
  - [None (interface)](#none-interface)
  - [Option (type alias)](#option-type-alias)
  - [OptionUnify (interface)](#optionunify-interface)
  - [OptionUnifyIgnore (interface)](#optionunifyignore-interface)
  - [Some (interface)](#some-interface)
- [pattern matching](#pattern-matching)
  - [match](#match)
- [sorting](#sorting)
  - [getOrder](#getorder)
- [symbols](#symbols)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)
- [transforming](#transforming)
  - [as](#as)
  - [asUnit](#asunit)
  - [composeK](#composek)
  - [flatMap](#flatmap)
  - [flatMapNullable](#flatmapnullable)
  - [flatten](#flatten)
  - [map](#map)
  - [tap](#tap)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)
- [type lambdas](#type-lambdas)
  - [OptionTypeLambda (interface)](#optiontypelambda-interface)
- [utils](#utils)
  - [exists](#exists)
  - [unit](#unit)

---

# combining

## all

Takes a structure of `Option`s and returns an `Option` of values with the same structure.

- If a tuple is supplied, then the returned `Option` will contain a tuple with the same length.
- If a struct is supplied, then the returned `Option` will contain a struct with the same keys.
- If an iterable is supplied, then the returned `Option` will contain an array.

**Signature**

```ts
export declare const all: <const I extends Iterable<Option<any>> | Record<string, Option<any>>>(
  input: I
) => [I] extends [readonly Option<any>[]]
  ? Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }>
  : [I] extends [Iterable<Option<infer A>>]
    ? Option<A[]>
    : Option<{ -readonly [K in keyof I]: [I[K]] extends [Option<infer A>] ? A : never }>
```

**Example**

```ts
import * as O from "effect/Option"

assert.deepStrictEqual(O.all([O.some(1), O.some(2)]), O.some([1, 2]))
assert.deepStrictEqual(O.all({ a: O.some(1), b: O.some("hello") }), O.some({ a: 1, b: "hello" }))
assert.deepStrictEqual(O.all({ a: O.some(1), b: O.none() }), O.none())
```

Added in v2.0.0

## ap

**Signature**

```ts
export declare const ap: {
  <A>(that: Option<A>): <B>(self: Option<(a: A) => B>) => Option<B>
  <A, B>(self: Option<(a: A) => B>, that: Option<A>): Option<B>
}
```

Added in v2.0.0

## product

**Signature**

```ts
export declare const product: <A, B>(self: Option<A>, that: Option<B>) => Option<[A, B]>
```

Added in v2.0.0

## productMany

**Signature**

```ts
export declare const productMany: <A>(self: Option<A>, collection: Iterable<Option<A>>) => Option<[A, ...A[]]>
```

Added in v2.0.0

## zipWith

Zips two `Option` values together using a provided function, returning a new `Option` of the result.

**Signature**

```ts
export declare const zipWith: {
  <B, A, C>(that: Option<B>, f: (a: A, b: B) => C): (self: Option<A>) => Option<C>
  <A, B, C>(self: Option<A>, that: Option<B>, f: (a: A, b: B) => C): Option<C>
}
```

**Example**

```ts
import * as O from "effect/Option"

type Complex = [real: number, imaginary: number]

const complex = (real: number, imaginary: number): Complex => [real, imaginary]

assert.deepStrictEqual(O.zipWith(O.none(), O.none(), complex), O.none())
assert.deepStrictEqual(O.zipWith(O.some(1), O.none(), complex), O.none())
assert.deepStrictEqual(O.zipWith(O.none(), O.some(1), complex), O.none())
assert.deepStrictEqual(O.zipWith(O.some(1), O.some(2), complex), O.some([1, 2]))

assert.deepStrictEqual(O.zipWith(O.some(1), complex)(O.some(2)), O.some([2, 1]))
```

Added in v2.0.0

# constructors

## none

Creates a new `Option` that represents the absence of a value.

**Signature**

```ts
export declare const none: <A = never>() => Option<A>
```

Added in v2.0.0

## some

Creates a new `Option` that wraps the given value.

**Signature**

```ts
export declare const some: <A>(value: A) => Option<A>
```

Added in v2.0.0

# conversions

## fromIterable

Converts an `Iterable` of values into an `Option`. Returns the first value of the `Iterable` wrapped in a `Some`
if the `Iterable` is not empty, otherwise returns `None`.

**Signature**

```ts
export declare const fromIterable: <A>(collection: Iterable<A>) => Option<A>
```

**Example**

```ts
import { fromIterable, some, none } from "effect/Option"

assert.deepStrictEqual(fromIterable([1, 2, 3]), some(1))
assert.deepStrictEqual(fromIterable([]), none())
```

Added in v2.0.0

## fromNullable

Constructs a new `Option` from a nullable type. If the value is `null` or `undefined`, returns `None`, otherwise
returns the value wrapped in a `Some`.

**Signature**

```ts
export declare const fromNullable: <A>(nullableValue: A) => Option<NonNullable<A>>
```

**Example**

```ts
import * as O from "effect/Option"

assert.deepStrictEqual(O.fromNullable(undefined), O.none())
assert.deepStrictEqual(O.fromNullable(null), O.none())
assert.deepStrictEqual(O.fromNullable(1), O.some(1))
```

Added in v2.0.0

## getLeft

Converts a `Either` to an `Option` discarding the value.

**Signature**

```ts
export declare const getLeft: <E, A>(self: Either<E, A>) => Option<E>
```

**Example**

```ts
import * as O from "effect/Option"
import * as E from "effect/Either"

assert.deepStrictEqual(O.getLeft(E.right("ok")), O.none())
assert.deepStrictEqual(O.getLeft(E.left("a")), O.some("a"))
```

Added in v2.0.0

## getOrThrow

Extracts the value of an `Option` or throws if the `Option` is `None`.

The thrown error is a default error. To configure the error thrown, see {@link getOrThrowWith}.

**Signature**

```ts
export declare const getOrThrow: <A>(self: Option<A>) => A
```

**Example**

```ts
import * as O from "effect/Option"

assert.deepStrictEqual(O.getOrThrow(O.some(1)), 1)
assert.throws(() => O.getOrThrow(O.none()))
```

Added in v2.0.0

## getOrThrowWith

Extracts the value of an `Option` or throws if the `Option` is `None`.

If a default error is sufficient for your use case and you don't need to configure the thrown error, see {@link getOrThrow}.

**Signature**

```ts
export declare const getOrThrowWith: {
  (onNone: () => unknown): <A>(self: Option<A>) => A
  <A>(self: Option<A>, onNone: () => unknown): A
}
```

**Example**

```ts
import * as O from "effect/Option"

assert.deepStrictEqual(
  O.getOrThrowWith(O.some(1), () => new Error("Unexpected None")),
  1
)
assert.throws(() => O.getOrThrowWith(O.none(), () => new Error("Unexpected None")))
```

Added in v2.0.0

## getRight

Converts a `Either` to an `Option` discarding the error.

Alias of {@link fromEither}.

**Signature**

```ts
export declare const getRight: <E, A>(self: Either<E, A>) => Option<A>
```

**Example**

```ts
import * as O from "effect/Option"
import * as E from "effect/Either"

assert.deepStrictEqual(O.getRight(E.right("ok")), O.some("ok"))
assert.deepStrictEqual(O.getRight(E.left("err")), O.none())
```

Added in v2.0.0

## liftNullable

This API is useful for lifting a function that returns `null` or `undefined` into the `Option` context.

**Signature**

```ts
export declare const liftNullable: <A extends readonly unknown[], B>(
  f: (...a: A) => B | null | undefined
) => (...a: A) => Option<NonNullable<B>>
```

**Example**

```ts
import * as O from "effect/Option"

const parse = (s: string): number | undefined => {
  const n = parseFloat(s)
  return isNaN(n) ? undefined : n
}

const parseOption = O.liftNullable(parse)

assert.deepStrictEqual(parseOption("1"), O.some(1))
assert.deepStrictEqual(parseOption("not a number"), O.none())
```

Added in v2.0.0

## liftThrowable

A utility function that lifts a function that throws exceptions into a function that returns an `Option`.

This function is useful for any function that might throw an exception, allowing the developer to handle
the exception in a more functional way.

**Signature**

```ts
export declare const liftThrowable: <A extends readonly unknown[], B>(f: (...a: A) => B) => (...a: A) => Option<B>
```

**Example**

```ts
import * as O from "effect/Option"

const parse = O.liftThrowable(JSON.parse)

assert.deepStrictEqual(parse("1"), O.some(1))
assert.deepStrictEqual(parse(""), O.none())
```

Added in v2.0.0

## toArray

Transforms an `Option` into an `Array`.
If the input is `None`, an empty array is returned.
If the input is `Some`, the value is wrapped in an array.

**Signature**

```ts
export declare const toArray: <A>(self: Option<A>) => A[]
```

**Example**

```ts
import * as O from "effect/Option"

assert.deepStrictEqual(O.toArray(O.some(1)), [1])
assert.deepStrictEqual(O.toArray(O.none()), [])
```

Added in v2.0.0

## toRefinement

Returns a type guard from a `Option` returning function.
This function ensures that a type guard definition is type-safe.

**Signature**

```ts
export declare const toRefinement: <A, B extends A>(f: (a: A) => Option<B>) => (a: A) => a is B
```

**Example**

```ts
import * as O from "effect/Option"

const parsePositive = (n: number): O.Option<number> => (n > 0 ? O.some(n) : O.none())

const isPositive = O.toRefinement(parsePositive)

assert.deepStrictEqual(isPositive(1), true)
assert.deepStrictEqual(isPositive(-1), false)
```

Added in v2.0.0

# do notation

## Do

**Signature**

```ts
export declare const Do: Option<{}>
```

Added in v2.0.0

## bind

**Signature**

```ts
export declare const bind: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => Option<B>
  ): (self: Option<A>) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
  <A extends object, N extends string, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => Option<B>
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
}
```

Added in v2.0.0

## bindTo

**Signature**

```ts
export declare const bindTo: {
  <N extends string>(name: N): <A>(self: Option<A>) => Option<{ [K in N]: A }>
  <A, N extends string>(self: Option<A>, name: N): Option<{ [K in N]: A }>
}
```

Added in v2.0.0

## let

**Signature**

```ts
export declare const let: {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): (self: Option<A>) => Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
  <A extends object, N extends string, B>(
    self: Option<A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): Option<{ [K in N | keyof A]: K extends keyof A ? A[K] : B }>
}
```

Added in v2.0.0

# elements

## contains

Returns a function that checks if an `Option` contains a given value using the default `Equivalence`.

**Signature**

```ts
export declare const contains: { <A>(a: A): (self: Option<A>) => boolean; <A>(self: Option<A>, a: A): boolean }
```

Added in v2.0.0

## containsWith

Returns a function that checks if a `Option` contains a given value using a provided `isEquivalent` function.

**Signature**

```ts
export declare const containsWith: <A>(isEquivalent: (self: A, that: A) => boolean) => {
  (a: A): (self: Option<A>) => boolean
  (self: Option<A>, a: A): boolean
}
```

**Example**

```ts
import { some, none, containsWith } from "effect/Option"
import { Equivalence } from "effect/Number"
import { pipe } from "effect/Function"

assert.deepStrictEqual(pipe(some(2), containsWith(Equivalence)(2)), true)
assert.deepStrictEqual(pipe(some(1), containsWith(Equivalence)(2)), false)
assert.deepStrictEqual(pipe(none(), containsWith(Equivalence)(2)), false)
```

Added in v2.0.0

# equivalence

## getEquivalence

**Signature**

```ts
export declare const getEquivalence: <A>(isEquivalent: Equivalence.Equivalence<A>) => Equivalence.Equivalence<Option<A>>
```

**Example**

```ts
import { none, some, getEquivalence } from "effect/Option"
import * as N from "effect/Number"

const isEquivalent = getEquivalence(N.Equivalence)
assert.deepStrictEqual(isEquivalent(none(), none()), true)
assert.deepStrictEqual(isEquivalent(none(), some(1)), false)
assert.deepStrictEqual(isEquivalent(some(1), none()), false)
assert.deepStrictEqual(isEquivalent(some(1), some(2)), false)
assert.deepStrictEqual(isEquivalent(some(1), some(1)), true)
```

Added in v2.0.0

# error handling

## firstSomeOf

Given an `Iterable` collection of `Option`s, returns the first `Some` found in the collection.

**Signature**

```ts
export declare const firstSomeOf: <A>(collection: Iterable<Option<A>>) => Option<A>
```

**Example**

```ts
import * as O from "effect/Option"

assert.deepStrictEqual(O.firstSomeOf([O.none(), O.some(1), O.some(2)]), O.some(1))
```

Added in v2.0.0

## orElse

Returns the provided `Option` `that` if `self` is `None`, otherwise returns `self`.

**Signature**

```ts
export declare const orElse: {
  <B>(that: LazyArg<Option<B>>): <A>(self: Option<A>) => Option<B | A>
  <A, B>(self: Option<A>, that: LazyArg<Option<B>>): Option<A | B>
}
```

**Example**

```ts
import * as O from "effect/Option"
import { pipe } from "effect/Function"

assert.deepStrictEqual(
  pipe(
    O.none(),
    O.orElse(() => O.none())
  ),
  O.none()
)
assert.deepStrictEqual(
  pipe(
    O.some("a"),
    O.orElse(() => O.none())
  ),
  O.some("a")
)
assert.deepStrictEqual(
  pipe(
    O.none(),
    O.orElse(() => O.some("b"))
  ),
  O.some("b")
)
assert.deepStrictEqual(
  pipe(
    O.some("a"),
    O.orElse(() => O.some("b"))
  ),
  O.some("a")
)
```

Added in v2.0.0

## orElseEither

Similar to `orElse`, but instead of returning a simple union, it returns an `Either` object,
which contains information about which of the two `Option`s has been chosen.

This is useful when it's important to know whether the value was retrieved from the first `Option` or the second option.

**Signature**

```ts
export declare const orElseEither: {
  <B>(that: LazyArg<Option<B>>): <A>(self: Option<A>) => Option<Either<A, B>>
  <A, B>(self: Option<A>, that: LazyArg<Option<B>>): Option<Either<A, B>>
}
```

Added in v2.0.0

# filtering

## filter

Filters an `Option` using a predicate. If the predicate is not satisfied or the `Option` is `None` returns `None`.

If you need to change the type of the `Option` in addition to filtering, see `filterMap`.

**Signature**

```ts
export declare const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Option<A>) => Option<B>
  <B extends A, A = B>(predicate: Predicate<A>): (self: Option<B>) => Option<B>
  <A, B extends A>(self: Option<A>, refinement: Refinement<A, B>): Option<B>
  <A>(self: Option<A>, predicate: Predicate<A>): Option<A>
}
```

**Example**

```ts
import * as O from "effect/Option"

// predicate
const isEven = (n: number) => n % 2 === 0

assert.deepStrictEqual(O.filter(O.none(), isEven), O.none())
assert.deepStrictEqual(O.filter(O.some(3), isEven), O.none())
assert.deepStrictEqual(O.filter(O.some(2), isEven), O.some(2))

// refinement
const isNumber = (v: unknown): v is number => typeof v === "number"

assert.deepStrictEqual(O.filter(O.none(), isNumber), O.none())
assert.deepStrictEqual(O.filter(O.some("hello"), isNumber), O.none())
assert.deepStrictEqual(O.filter(O.some(2), isNumber), O.some(2))
```

Added in v2.0.0

## filterMap

Maps over the value of an `Option` and filters out `None`s.

Useful when in addition to filtering you also want to change the type of the `Option`.

**Signature**

```ts
export declare const filterMap: {
  <A, B>(f: (a: A) => Option<B>): (self: Option<A>) => Option<B>
  <A, B>(self: Option<A>, f: (a: A) => Option<B>): Option<B>
}
```

**Example**

```ts
import * as O from "effect/Option"

const evenNumber = (n: number) => (n % 2 === 0 ? O.some(n) : O.none())

assert.deepStrictEqual(O.filterMap(O.none(), evenNumber), O.none())
assert.deepStrictEqual(O.filterMap(O.some(3), evenNumber), O.none())
assert.deepStrictEqual(O.filterMap(O.some(2), evenNumber), O.some(2))
```

Added in v2.0.0

## partitionMap

**Signature**

```ts
export declare const partitionMap: {
  <A, B, C>(f: (a: A) => Either<B, C>): (self: Option<A>) => [left: Option<B>, right: Option<C>]
  <A, B, C>(self: Option<A>, f: (a: A) => Either<B, C>): [left: Option<B>, right: Option<C>]
}
```

Added in v2.0.0

# folding

## reduceCompact

Reduces an `Iterable` of `Option<A>` to a single value of type `B`, elements that are `None` are ignored.

**Signature**

```ts
export declare const reduceCompact: {
  <B, A>(b: B, f: (b: B, a: A) => B): (self: Iterable<Option<A>>) => B
  <A, B>(self: Iterable<Option<A>>, b: B, f: (b: B, a: A) => B): B
}
```

**Example**

```ts
import { some, none, reduceCompact } from "effect/Option"
import { pipe } from "effect/Function"

const iterable = [some(1), none(), some(2), none()]
assert.deepStrictEqual(
  pipe(
    iterable,
    reduceCompact(0, (b, a) => b + a)
  ),
  3
)
```

Added in v2.0.0

# generators

## gen

**Signature**

```ts
export declare const gen: Gen.Gen<OptionTypeLambda, Gen.Adapter<OptionTypeLambda>>
```

Added in v2.0.0

# getters

## getOrElse

Returns the value of the `Option` if it is `Some`, otherwise returns `onNone`

**Signature**

```ts
export declare const getOrElse: {
  <B>(onNone: LazyArg<B>): <A>(self: Option<A>) => B | A
  <A, B>(self: Option<A>, onNone: LazyArg<B>): A | B
}
```

**Example**

```ts
import { some, none, getOrElse } from "effect/Option"
import { pipe } from "effect/Function"

assert.deepStrictEqual(
  pipe(
    some(1),
    getOrElse(() => 0)
  ),
  1
)
assert.deepStrictEqual(
  pipe(
    none(),
    getOrElse(() => 0)
  ),
  0
)
```

Added in v2.0.0

## getOrNull

Returns the value of the `Option` if it is a `Some`, otherwise returns `null`.

**Signature**

```ts
export declare const getOrNull: <A>(self: Option<A>) => A | null
```

**Example**

```ts
import * as O from "effect/Option"

assert.deepStrictEqual(O.getOrNull(O.some(1)), 1)
assert.deepStrictEqual(O.getOrNull(O.none()), null)
```

Added in v2.0.0

## getOrUndefined

Returns the value of the `Option` if it is a `Some`, otherwise returns `undefined`.

**Signature**

```ts
export declare const getOrUndefined: <A>(self: Option<A>) => A | undefined
```

**Example**

```ts
import * as O from "effect/Option"

assert.deepStrictEqual(O.getOrUndefined(O.some(1)), 1)
assert.deepStrictEqual(O.getOrUndefined(O.none()), undefined)
```

Added in v2.0.0

# guards

## isNone

Determine if a `Option` is a `None`.

**Signature**

```ts
export declare const isNone: <A>(self: Option<A>) => self is None<A>
```

**Example**

```ts
import { some, none, isNone } from "effect/Option"

assert.deepStrictEqual(isNone(some(1)), false)
assert.deepStrictEqual(isNone(none()), true)
```

Added in v2.0.0

## isOption

Tests if a value is a `Option`.

**Signature**

```ts
export declare const isOption: (input: unknown) => input is Option<unknown>
```

**Example**

```ts
import { some, none, isOption } from "effect/Option"

assert.deepStrictEqual(isOption(some(1)), true)
assert.deepStrictEqual(isOption(none()), true)
assert.deepStrictEqual(isOption({}), false)
```

Added in v2.0.0

## isSome

Determine if a `Option` is a `Some`.

**Signature**

```ts
export declare const isSome: <A>(self: Option<A>) => self is Some<A>
```

**Example**

```ts
import { some, none, isSome } from "effect/Option"

assert.deepStrictEqual(isSome(some(1)), true)
assert.deepStrictEqual(isSome(none()), false)
```

Added in v2.0.0

# lifting

## lift2

Lifts a binary function into `Option`.

**Signature**

```ts
export declare const lift2: <A, B, C>(
  f: (a: A, b: B) => C
) => { (that: Option<B>): (self: Option<A>) => Option<C>; (self: Option<A>, that: Option<B>): Option<C> }
```

Added in v2.0.0

## liftPredicate

Transforms a `Predicate` function into a `Some` of the input value if the predicate returns `true` or `None`
if the predicate returns `false`.

**Signature**

```ts
export declare const liftPredicate: {
  <A, B extends A>(refinement: Refinement<A, B>): (a: A) => Option<B>
  <B extends A, A = B>(predicate: Predicate<A>): (b: B) => Option<B>
}
```

**Example**

```ts
import * as O from "effect/Option"

const getOption = O.liftPredicate((n: number) => n >= 0)

assert.deepStrictEqual(getOption(-1), O.none())
assert.deepStrictEqual(getOption(1), O.some(1))
```

Added in v2.0.0

# models

## None (interface)

**Signature**

```ts
export interface None<out A> extends Data.Case, Pipeable, Inspectable {
  readonly _tag: "None"
  readonly _op: "None"
  readonly [TypeId]: {
    readonly _A: Types.Covariant<A>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: OptionUnify<this>
  [Unify.ignoreSymbol]?: OptionUnifyIgnore
}
```

Added in v2.0.0

## Option (type alias)

**Signature**

```ts
export type Option<A> = None<A> | Some<A>
```

Added in v2.0.0

## OptionUnify (interface)

**Signature**

```ts
export interface OptionUnify<A extends { [Unify.typeSymbol]?: any }> {
  Option?: () => A[Unify.typeSymbol] extends Option<infer A0> | infer _ ? Option<A0> : never
}
```

Added in v2.0.0

## OptionUnifyIgnore (interface)

**Signature**

```ts
export interface OptionUnifyIgnore {}
```

Added in v2.0.0

## Some (interface)

**Signature**

```ts
export interface Some<out A> extends Data.Case, Pipeable, Inspectable {
  readonly _tag: "Some"
  readonly _op: "Some"
  readonly value: A
  readonly [TypeId]: {
    readonly _A: Types.Covariant<A>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: OptionUnify<this>
  [Unify.ignoreSymbol]?: OptionUnifyIgnore
}
```

Added in v2.0.0

# pattern matching

## match

Matches the given `Option` and returns either the provided `onNone` value or the result of the provided `onSome`
function when passed the `Option`'s value.

**Signature**

```ts
export declare const match: {
  <B, A, C = B>(options: { readonly onNone: LazyArg<B>; readonly onSome: (a: A) => C }): (self: Option<A>) => B | C
  <A, B, C = B>(self: Option<A>, options: { readonly onNone: LazyArg<B>; readonly onSome: (a: A) => C }): B | C
}
```

**Example**

```ts
import { some, none, match } from "effect/Option"
import { pipe } from "effect/Function"

assert.deepStrictEqual(
  pipe(some(1), match({ onNone: () => "a none", onSome: (a) => `a some containing ${a}` })),
  "a some containing 1"
)

assert.deepStrictEqual(
  pipe(none(), match({ onNone: () => "a none", onSome: (a) => `a some containing ${a}` })),
  "a none"
)
```

Added in v2.0.0

# sorting

## getOrder

The `Order` instance allows `Option` values to be compared with
`compare`, whenever there is an `Order` instance for
the type the `Option` contains.

`None` is considered to be less than any `Some` value.

**Signature**

```ts
export declare const getOrder: <A>(O: Order<A>) => Order<Option<A>>
```

**Example**

```ts
import { none, some, getOrder } from "effect/Option"
import * as N from "effect/Number"
import { pipe } from "effect/Function"

const O = getOrder(N.Order)
assert.deepStrictEqual(O(none(), none()), 0)
assert.deepStrictEqual(O(none(), some(1)), -1)
assert.deepStrictEqual(O(some(1), none()), 1)
assert.deepStrictEqual(O(some(1), some(2)), -1)
assert.deepStrictEqual(O(some(1), some(1)), 0)
```

Added in v2.0.0

# symbols

## TypeId

**Signature**

```ts
export declare const TypeId: typeof TypeId
```

Added in v2.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0

# transforming

## as

Maps the `Some` value of this `Option` to the specified constant value.

**Signature**

```ts
export declare const as: <B>(b: B) => <_>(self: Option<_>) => Option<B>
```

Added in v2.0.0

## asUnit

Maps the `Some` value of this `Option` to the `void` constant value.

This is useful when the value of the `Option` is not needed, but the presence or absence of the value is important.

**Signature**

```ts
export declare const asUnit: <_>(self: Option<_>) => Option<void>
```

Added in v2.0.0

## composeK

**Signature**

```ts
export declare const composeK: {
  <B, C>(bfc: (b: B) => Option<C>): <A>(afb: (a: A) => Option<B>) => (a: A) => Option<C>
  <A, B, C>(afb: (a: A) => Option<B>, bfc: (b: B) => Option<C>): (a: A) => Option<C>
}
```

Added in v2.0.0

## flatMap

Applies a function to the value of an `Option` and flattens the result, if the input is `Some`.

**Signature**

```ts
export declare const flatMap: {
  <A, B>(f: (a: A) => Option<B>): (self: Option<A>) => Option<B>
  <A, B>(self: Option<A>, f: (a: A) => Option<B>): Option<B>
}
```

Added in v2.0.0

## flatMapNullable

This is `flatMap` + `fromNullable`, useful when working with optional values.

**Signature**

```ts
export declare const flatMapNullable: {
  <A, B>(f: (a: A) => B | null | undefined): (self: Option<A>) => Option<NonNullable<B>>
  <A, B>(self: Option<A>, f: (a: A) => B | null | undefined): Option<NonNullable<B>>
}
```

**Example**

```ts
import { some, none, flatMapNullable } from "effect/Option"
import { pipe } from "effect/Function"

interface Employee {
  company?: {
    address?: {
      street?: {
        name?: string
      }
    }
  }
}

const employee1: Employee = { company: { address: { street: { name: "high street" } } } }

assert.deepStrictEqual(
  pipe(
    some(employee1),
    flatMapNullable((employee) => employee.company?.address?.street?.name)
  ),
  some("high street")
)

const employee2: Employee = { company: { address: { street: {} } } }

assert.deepStrictEqual(
  pipe(
    some(employee2),
    flatMapNullable((employee) => employee.company?.address?.street?.name)
  ),
  none()
)
```

Added in v2.0.0

## flatten

**Signature**

```ts
export declare const flatten: <A>(self: Option<Option<A>>) => Option<A>
```

Added in v2.0.0

## map

Maps the `Some` side of an `Option` value to a new `Option` value.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): (self: Option<A>) => Option<B>
  <A, B>(self: Option<A>, f: (a: A) => B): Option<B>
}
```

Added in v2.0.0

## tap

Applies the provided function `f` to the value of the `Option` if it is `Some` and returns the original `Option`
unless `f` returns `None`, in which case it returns `None`.

This function is useful for performing additional computations on the value of the input `Option` without affecting its value.

**Signature**

```ts
export declare const tap: {
  <A, _>(f: (a: A) => Option<_>): (self: Option<A>) => Option<A>
  <A, _>(self: Option<A>, f: (a: A) => Option<_>): Option<A>
}
```

**Example**

```ts
import * as O from "effect/Option"

const getInteger = (n: number) => (Number.isInteger(n) ? O.some(n) : O.none())

assert.deepStrictEqual(O.tap(O.none(), getInteger), O.none())
assert.deepStrictEqual(O.tap(O.some(1), getInteger), O.some(1))
assert.deepStrictEqual(O.tap(O.some(1.14), getInteger), O.none())
```

Added in v2.0.0

## zipLeft

Sequences the specified `that` `Option` but ignores its value.

It is useful when we want to chain multiple operations, but only care about the result of `self`.

**Signature**

```ts
export declare const zipLeft: {
  <_>(that: Option<_>): <A>(self: Option<A>) => Option<A>
  <A, _>(self: Option<A>, that: Option<_>): Option<A>
}
```

Added in v2.0.0

## zipRight

**Signature**

```ts
export declare const zipRight: {
  <B>(that: Option<B>): <_>(self: Option<_>) => Option<B>
  <_, B>(self: Option<_>, that: Option<B>): Option<B>
}
```

Added in v2.0.0

# type lambdas

## OptionTypeLambda (interface)

**Signature**

```ts
export interface OptionTypeLambda extends TypeLambda {
  readonly type: Option<this["Target"]>
}
```

Added in v2.0.0

# utils

## exists

Check if a value in an `Option` type meets a certain predicate.

**Signature**

```ts
export declare const exists: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: Option<A>) => self is Option<B>
  <B extends A, A = B>(predicate: Predicate<A>): (self: Option<B>) => boolean
  <A, B extends A>(self: Option<A>, refinement: Refinement<A, B>): self is Option<B>
  <A>(self: Option<A>, predicate: Predicate<A>): boolean
}
```

**Example**

```ts
import { some, none, exists } from "effect/Option"
import { pipe } from "effect/Function"

const isEven = (n: number) => n % 2 === 0

assert.deepStrictEqual(pipe(some(2), exists(isEven)), true)
assert.deepStrictEqual(pipe(some(1), exists(isEven)), false)
assert.deepStrictEqual(pipe(none(), exists(isEven)), false)
```

Added in v2.0.0

## unit

**Signature**

```ts
export declare const unit: Option<void>
```

Added in v2.0.0
