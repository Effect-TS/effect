---
title: Either.ts
nav_order: 25
parent: Modules
---

## Either overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combining](#combining)
  - [all](#all)
  - [ap](#ap)
  - [zipWith](#zipwith)
- [constructors](#constructors)
  - [fromNullable](#fromnullable)
  - [fromOption](#fromoption)
  - [left](#left)
  - [right](#right)
  - [try](#try)
- [equivalence](#equivalence)
  - [getEquivalence](#getequivalence)
- [error handling](#error-handling)
  - [orElse](#orelse)
- [generators](#generators)
  - [gen](#gen)
- [getters](#getters)
  - [getLeft](#getleft)
  - [getOrElse](#getorelse)
  - [getOrNull](#getornull)
  - [getOrThrow](#getorthrow)
  - [getOrThrowWith](#getorthrowwith)
  - [getOrUndefined](#getorundefined)
  - [getRight](#getright)
  - [merge](#merge)
- [guards](#guards)
  - [isEither](#iseither)
  - [isLeft](#isleft)
  - [isRight](#isright)
- [mapping](#mapping)
  - [flip](#flip)
  - [map](#map)
  - [mapBoth](#mapboth)
  - [mapLeft](#mapleft)
- [models](#models)
  - [Either (type alias)](#either-type-alias)
  - [EitherUnify (interface)](#eitherunify-interface)
  - [EitherUnifyIgnore (interface)](#eitherunifyignore-interface)
  - [Left (interface)](#left-interface)
  - [Right (interface)](#right-interface)
- [pattern matching](#pattern-matching)
  - [match](#match)
- [sequencing](#sequencing)
  - [andThen](#andthen)
  - [flatMap](#flatmap)
- [symbols](#symbols)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)
- [type lambdas](#type-lambdas)
  - [EitherTypeLambda (interface)](#eithertypelambda-interface)

---

# combining

## all

Takes a structure of `Either`s and returns an `Either` of values with the same structure.

- If a tuple is supplied, then the returned `Either` will contain a tuple with the same length.
- If a struct is supplied, then the returned `Either` will contain a struct with the same keys.
- If an iterable is supplied, then the returned `Either` will contain an array.

**Signature**

```ts
export declare const all: <const I extends Iterable<Either<any, any>> | Record<string, Either<any, any>>>(
  input: I
) => [I] extends [readonly Either<any, any>[]]
  ? Either<
      I[number] extends never ? never : [I[number]] extends [Either<infer E, any>] ? E : never,
      { -readonly [K in keyof I]: [I[K]] extends [Either<any, infer A>] ? A : never }
    >
  : [I] extends [Iterable<Either<infer E, infer A>>]
    ? Either<E, A[]>
    : Either<
        I[keyof I] extends never ? never : [I[keyof I]] extends [Either<infer E, any>] ? E : never,
        { -readonly [K in keyof I]: [I[K]] extends [Either<any, infer A>] ? A : never }
      >
```

**Example**

```ts
import * as Either from "effect/Either"

assert.deepStrictEqual(Either.all([Either.right(1), Either.right(2)]), Either.right([1, 2]))
assert.deepStrictEqual(Either.all({ a: Either.right(1), b: Either.right("hello") }), Either.right({ a: 1, b: "hello" }))
assert.deepStrictEqual(Either.all({ a: Either.right(1), b: Either.left("error") }), Either.left("error"))
```

Added in v2.0.0

## ap

**Signature**

```ts
export declare const ap: {
  <E2, A>(that: Either<E2, A>): <E, B>(self: Either<E, (a: A) => B>) => Either<E2 | E, B>
  <E, A, B, E2>(self: Either<E, (a: A) => B>, that: Either<E2, A>): Either<E | E2, B>
}
```

Added in v2.0.0

## zipWith

**Signature**

```ts
export declare const zipWith: {
  <E2, A2, A, B>(that: Either<E2, A2>, f: (a: A, b: A2) => B): <E>(self: Either<E, A>) => Either<E2 | E, B>
  <E, A, E2, A2, B>(self: Either<E, A>, that: Either<E2, A2>, f: (a: A, b: A2) => B): Either<E | E2, B>
}
```

Added in v2.0.0

# constructors

## fromNullable

Takes a lazy default and a nullable value, if the value is not nully (`null` or `undefined`), turn it into a `Right`, if the value is nully use
the provided default as a `Left`.

**Signature**

```ts
export declare const fromNullable: {
  <A, E>(onNullable: (a: A) => E): (self: A) => Either<E, NonNullable<A>>
  <A, E>(self: A, onNullable: (a: A) => E): Either<E, NonNullable<A>>
}
```

**Example**

```ts
import * as Either from "effect/Either"

assert.deepStrictEqual(
  Either.fromNullable(1, () => "fallback"),
  Either.right(1)
)
assert.deepStrictEqual(
  Either.fromNullable(null, () => "fallback"),
  Either.left("fallback")
)
```

Added in v2.0.0

## fromOption

**Signature**

```ts
export declare const fromOption: {
  <A, E>(self: Option<A>, onNone: () => E): Either<E, A>
  <E>(onNone: () => E): <A>(self: Option<A>) => Either<E, A>
}
```

**Example**

```ts
import * as Either from "effect/Either"
import * as Option from "effect/Option"

assert.deepStrictEqual(
  Either.fromOption(Option.some(1), () => "error"),
  Either.right(1)
)
assert.deepStrictEqual(
  Either.fromOption(Option.none(), () => "error"),
  Either.left("error")
)
```

Added in v2.0.0

## left

Constructs a new `Either` holding a `Left` value. This usually represents a failure, due to the right-bias of this
structure.

**Signature**

```ts
export declare const left: <E>(e: E) => Either<E, never>
```

Added in v2.0.0

## right

Constructs a new `Either` holding a `Right` value. This usually represents a successful value due to the right bias
of this structure.

**Signature**

```ts
export declare const right: <A>(a: A) => Either<never, A>
```

Added in v2.0.0

## try

Imports a synchronous side-effect into a pure `Either` value, translating any
thrown exceptions into typed failed eithers creating with `Either.left`.

**Signature**

```ts
export declare const try: { <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E; }): Either<E, A>; <A>(evaluate: LazyArg<A>): Either<unknown, A>; }
```

Added in v2.0.0

# equivalence

## getEquivalence

**Signature**

```ts
export declare const getEquivalence: <E, A>(
  EE: Equivalence.Equivalence<E>,
  EA: Equivalence.Equivalence<A>
) => Equivalence.Equivalence<Either<E, A>>
```

Added in v2.0.0

# error handling

## orElse

Returns `self` if it is a `Right` or `that` otherwise.

**Signature**

```ts
export declare const orElse: {
  <E1, E2, B>(that: (e1: E1) => Either<E2, B>): <A>(self: Either<E1, A>) => Either<E2, B | A>
  <E1, A, E2, B>(self: Either<E1, A>, that: (e1: E1) => Either<E2, B>): Either<E2, A | B>
}
```

Added in v2.0.0

# generators

## gen

**Signature**

```ts
export declare const gen: Gen.Gen<EitherTypeLambda, Gen.Adapter<EitherTypeLambda>>
```

Added in v2.0.0

# getters

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

assert.deepStrictEqual(E.getLeft(E.right("ok")), O.none())
assert.deepStrictEqual(E.getLeft(E.left("err")), O.some("err"))
```

Added in v2.0.0

## getOrElse

Returns the wrapped value if it's a `Right` or a default value if is a `Left`.

**Signature**

```ts
export declare const getOrElse: {
  <E, B>(onLeft: (e: E) => B): <A>(self: Either<E, A>) => B | A
  <E, A, B>(self: Either<E, A>, onLeft: (e: E) => B): A | B
}
```

**Example**

```ts
import * as Either from "effect/Either"

assert.deepStrictEqual(
  Either.getOrElse(Either.right(1), (error) => error + "!"),
  1
)
assert.deepStrictEqual(
  Either.getOrElse(Either.left("not a number"), (error) => error + "!"),
  "not a number!"
)
```

Added in v2.0.0

## getOrNull

**Signature**

```ts
export declare const getOrNull: <E, A>(self: Either<E, A>) => A | null
```

**Example**

```ts
import * as Either from "effect/Either"

assert.deepStrictEqual(Either.getOrNull(Either.right(1)), 1)
assert.deepStrictEqual(Either.getOrNull(Either.left("a")), null)
```

Added in v2.0.0

## getOrThrow

Extracts the value of an `Either` or throws if the `Either` is `Left`.

The thrown error is a default error. To configure the error thrown, see {@link getOrThrowWith}.

**Signature**

```ts
export declare const getOrThrow: <E, A>(self: Either<E, A>) => A
```

**Example**

```ts
import * as E from "effect/Either"

assert.deepStrictEqual(E.getOrThrow(E.right(1)), 1)
assert.throws(() => E.getOrThrow(E.left("error")))
```

Added in v2.0.0

## getOrThrowWith

Extracts the value of an `Either` or throws if the `Either` is `Left`.

If a default error is sufficient for your use case and you don't need to configure the thrown error, see {@link getOrThrow}.

**Signature**

```ts
export declare const getOrThrowWith: {
  <E>(onLeft: (e: E) => unknown): <A>(self: Either<E, A>) => A
  <E, A>(self: Either<E, A>, onLeft: (e: E) => unknown): A
}
```

**Example**

```ts
import * as E from "effect/Either"

assert.deepStrictEqual(
  E.getOrThrowWith(E.right(1), () => new Error("Unexpected Left")),
  1
)
assert.throws(() => E.getOrThrowWith(E.left("error"), () => new Error("Unexpected Left")))
```

Added in v2.0.0

## getOrUndefined

**Signature**

```ts
export declare const getOrUndefined: <E, A>(self: Either<E, A>) => A | undefined
```

**Example**

```ts
import * as Either from "effect/Either"

assert.deepStrictEqual(Either.getOrUndefined(Either.right(1)), 1)
assert.deepStrictEqual(Either.getOrUndefined(Either.left("a")), undefined)
```

Added in v2.0.0

## getRight

Converts a `Either` to an `Option` discarding the `Left`.

Alias of {@link toOption}.

**Signature**

```ts
export declare const getRight: <E, A>(self: Either<E, A>) => Option<A>
```

**Example**

```ts
import * as O from "effect/Option"
import * as E from "effect/Either"

assert.deepStrictEqual(E.getRight(E.right("ok")), O.some("ok"))
assert.deepStrictEqual(E.getRight(E.left("err")), O.none())
```

Added in v2.0.0

## merge

**Signature**

```ts
export declare const merge: <E, A>(self: Either<E, A>) => E | A
```

Added in v2.0.0

# guards

## isEither

Tests if a value is a `Either`.

**Signature**

```ts
export declare const isEither: (input: unknown) => input is Either<unknown, unknown>
```

**Example**

```ts
import { isEither, left, right } from "effect/Either"

assert.deepStrictEqual(isEither(right(1)), true)
assert.deepStrictEqual(isEither(left("a")), true)
assert.deepStrictEqual(isEither({ right: 1 }), false)
```

Added in v2.0.0

## isLeft

Determine if a `Either` is a `Left`.

**Signature**

```ts
export declare const isLeft: <E, A>(self: Either<E, A>) => self is Left<E, A>
```

**Example**

```ts
import { isLeft, left, right } from "effect/Either"

assert.deepStrictEqual(isLeft(right(1)), false)
assert.deepStrictEqual(isLeft(left("a")), true)
```

Added in v2.0.0

## isRight

Determine if a `Either` is a `Right`.

**Signature**

```ts
export declare const isRight: <E, A>(self: Either<E, A>) => self is Right<E, A>
```

**Example**

```ts
import { isRight, left, right } from "effect/Either"

assert.deepStrictEqual(isRight(right(1)), true)
assert.deepStrictEqual(isRight(left("a")), false)
```

Added in v2.0.0

# mapping

## flip

Returns an `Either` that swaps the error/success cases. This allows you to
use all methods on the error channel, possibly before flipping back.

**Signature**

```ts
export declare const flip: <E, A>(self: Either<E, A>) => Either<A, E>
```

Added in v2.0.0

## map

Maps the `Right` side of an `Either` value to a new `Either` value.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): <E>(self: Either<E, A>) => Either<E, B>
  <E, A, B>(self: Either<E, A>, f: (a: A) => B): Either<E, B>
}
```

Added in v2.0.0

## mapBoth

**Signature**

```ts
export declare const mapBoth: {
  <E1, E2, A, B>(options: {
    readonly onLeft: (e: E1) => E2
    readonly onRight: (a: A) => B
  }): (self: Either<E1, A>) => Either<E2, B>
  <E1, A, E2, B>(
    self: Either<E1, A>,
    options: { readonly onLeft: (e: E1) => E2; readonly onRight: (a: A) => B }
  ): Either<E2, B>
}
```

Added in v2.0.0

## mapLeft

Maps the `Left` side of an `Either` value to a new `Either` value.

**Signature**

```ts
export declare const mapLeft: {
  <E, G>(f: (e: E) => G): <A>(self: Either<E, A>) => Either<G, A>
  <E, A, G>(self: Either<E, A>, f: (e: E) => G): Either<G, A>
}
```

Added in v2.0.0

# models

## Either (type alias)

**Signature**

```ts
export type Either<E, A> = Left<E, A> | Right<E, A>
```

Added in v2.0.0

## EitherUnify (interface)

**Signature**

```ts
export interface EitherUnify<A extends { [Unify.typeSymbol]?: any }> {
  Either?: () => A[Unify.typeSymbol] extends Either<infer E0, infer A0> | infer _ ? Either<E0, A0> : never
}
```

Added in v2.0.0

## EitherUnifyIgnore (interface)

**Signature**

```ts
export interface EitherUnifyIgnore {}
```

Added in v2.0.0

## Left (interface)

**Signature**

```ts
export interface Left<out E, out A> extends Data.Case, Pipeable, Inspectable {
  readonly _tag: "Left"
  readonly _op: "Left"
  readonly left: E
  readonly [TypeId]: {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: EitherUnify<this>
  [Unify.ignoreSymbol]?: EitherUnifyIgnore
}
```

Added in v2.0.0

## Right (interface)

**Signature**

```ts
export interface Right<out E, out A> extends Data.Case, Pipeable, Inspectable {
  readonly _tag: "Right"
  readonly _op: "Right"
  readonly right: A
  readonly [TypeId]: {
    readonly _A: Types.Covariant<A>
    readonly _E: Types.Covariant<E>
  }
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: EitherUnify<this>
  [Unify.ignoreSymbol]?: EitherUnifyIgnore
}
```

Added in v2.0.0

# pattern matching

## match

Takes two functions and an `Either` value, if the value is a `Left` the inner value is applied to the `onLeft function,
if the value is a `Right`the inner value is applied to the`onRight` function.

**Signature**

```ts
export declare const match: {
  <E, B, A, C = B>(options: {
    readonly onLeft: (e: E) => B
    readonly onRight: (a: A) => C
  }): (self: Either<E, A>) => B | C
  <E, A, B, C = B>(self: Either<E, A>, options: { readonly onLeft: (e: E) => B; readonly onRight: (a: A) => C }): B | C
}
```

**Example**

```ts
import * as E from "effect/Either"
import { pipe } from "effect/Function"

const onLeft = (strings: ReadonlyArray<string>): string => `strings: ${strings.join(", ")}`

const onRight = (value: number): string => `Ok: ${value}`

assert.deepStrictEqual(pipe(E.right(1), E.match({ onLeft, onRight })), "Ok: 1")
assert.deepStrictEqual(
  pipe(E.left(["string 1", "string 2"]), E.match({ onLeft, onRight })),
  "strings: string 1, string 2"
)
```

Added in v2.0.0

# sequencing

## andThen

Executes a sequence of two `Either`s. The second `Either` can be dependent on the result of the first `Either`.

**Signature**

```ts
export declare const andThen: {
  <A, E2, B>(f: (a: A) => Either<E2, B>): <E1>(self: Either<E1, A>) => Either<E2 | E1, B>
  <E2, B>(f: Either<E2, B>): <E1, A>(self: Either<E1, A>) => Either<E2 | E1, B>
  <E1, A, E2, B>(self: Either<E1, A>, f: (a: A) => Either<E2, B>): Either<E1 | E2, B>
  <E1, A, E2, B>(self: Either<E1, A>, f: Either<E2, B>): Either<E1 | E2, B>
}
```

Added in v2.0.0

## flatMap

**Signature**

```ts
export declare const flatMap: {
  <A, E2, B>(f: (a: A) => Either<E2, B>): <E1>(self: Either<E1, A>) => Either<E2 | E1, B>
  <E1, A, E2, B>(self: Either<E1, A>, f: (a: A) => Either<E2, B>): Either<E1 | E2, B>
}
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

# type lambdas

## EitherTypeLambda (interface)

**Signature**

```ts
export interface EitherTypeLambda extends TypeLambda {
  readonly type: Either<this["Out1"], this["Target"]>
}
```

Added in v2.0.0
