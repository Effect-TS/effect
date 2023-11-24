---
title: Equivalence.ts
nav_order: 28
parent: Modules
---

## Equivalence overview

This module provides an implementation of the `Equivalence` type class, which defines a binary relation
that is reflexive, symmetric, and transitive. In other words, it defines a notion of equivalence between values of a certain type.
These properties are also known in mathematics as an "equivalence relation".

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [array](#array)
  - [struct](#struct)
  - [tuple](#tuple)
- [combining](#combining)
  - [all](#all)
  - [combine](#combine)
  - [combineAll](#combineall)
  - [combineMany](#combinemany)
  - [product](#product)
  - [productMany](#productmany)
- [constructors](#constructors)
  - [make](#make)
  - [strict](#strict)
- [instances](#instances)
  - [Date](#date)
  - [bigint](#bigint)
  - [boolean](#boolean)
  - [number](#number)
  - [string](#string)
  - [symbol](#symbol)
- [mapping](#mapping)
  - [mapInput](#mapinput)
- [type class](#type-class)
  - [Equivalence (interface)](#equivalence-interface)
- [type lambdas](#type-lambdas)
  - [EquivalenceTypeLambda (interface)](#equivalencetypelambda-interface)

---

# combinators

## array

Creates a new `Equivalence` for an array of values based on a given `Equivalence` for the elements of the array.

**Signature**

```ts
export declare const array: <A>(item: Equivalence<A>) => Equivalence<readonly A[]>
```

Added in v2.0.0

## struct

Given a struct of `Equivalence`s returns a new `Equivalence` that compares values of a struct
by applying each `Equivalence` to the corresponding property of the struct.

**Signature**

```ts
export declare const struct: <R extends Record<string, Equivalence<any>>>(
  fields: R
) => Equivalence<{ readonly [K in keyof R]: [R[K]] extends [Equivalence<infer A>] ? A : never }>
```

Added in v2.0.0

## tuple

Similar to `Promise.all` but operates on `Equivalence`s.

```
[Equivalence<A>, Equivalence<B>, ...] -> Equivalence<[A, B, ...]>
```

Given a tuple of `Equivalence`s returns a new `Equivalence` that compares values of a tuple
by applying each `Equivalence` to the corresponding element of the tuple.

**Signature**

```ts
export declare const tuple: <T extends readonly Equivalence<any>[]>(
  ...elements: T
) => Equivalence<Readonly<{ [I in keyof T]: [T[I]] extends [Equivalence<infer A>] ? A : never }>>
```

Added in v2.0.0

# combining

## all

**Signature**

```ts
export declare const all: <A>(collection: Iterable<Equivalence<A>>) => Equivalence<readonly A[]>
```

Added in v2.0.0

## combine

**Signature**

```ts
export declare const combine: {
  <A>(that: Equivalence<A>): (self: Equivalence<A>) => Equivalence<A>
  <A>(self: Equivalence<A>, that: Equivalence<A>): Equivalence<A>
}
```

Added in v2.0.0

## combineAll

**Signature**

```ts
export declare const combineAll: <A>(collection: Iterable<Equivalence<A>>) => Equivalence<A>
```

Added in v2.0.0

## combineMany

**Signature**

```ts
export declare const combineMany: {
  <A>(collection: Iterable<Equivalence<A>>): (self: Equivalence<A>) => Equivalence<A>
  <A>(self: Equivalence<A>, collection: Iterable<Equivalence<A>>): Equivalence<A>
}
```

Added in v2.0.0

## product

**Signature**

```ts
export declare const product: {
  <B>(that: Equivalence<B>): <A>(self: Equivalence<A>) => Equivalence<readonly [A, B]>
  <A, B>(self: Equivalence<A>, that: Equivalence<B>): Equivalence<readonly [A, B]>
}
```

Added in v2.0.0

## productMany

**Signature**

```ts
export declare const productMany: <A>(
  self: Equivalence<A>,
  collection: Iterable<Equivalence<A>>
) => Equivalence<readonly [A, ...A[]]>
```

Added in v2.0.0

# constructors

## make

**Signature**

```ts
export declare const make: <A>(isEquivalent: (self: A, that: A) => boolean) => Equivalence<A>
```

Added in v2.0.0

## strict

Return an `Equivalence` that uses strict equality (===) to compare values.

**Signature**

```ts
export declare const strict: <A>() => Equivalence<A>
```

Added in v2.0.0

# instances

## Date

**Signature**

```ts
export declare const Date: Equivalence<Date>
```

Added in v2.0.0

## bigint

**Signature**

```ts
export declare const bigint: Equivalence<bigint>
```

Added in v2.0.0

## boolean

**Signature**

```ts
export declare const boolean: Equivalence<boolean>
```

Added in v2.0.0

## number

**Signature**

```ts
export declare const number: Equivalence<number>
```

Added in v2.0.0

## string

**Signature**

```ts
export declare const string: Equivalence<string>
```

Added in v2.0.0

## symbol

**Signature**

```ts
export declare const symbol: Equivalence<symbol>
```

Added in v2.0.0

# mapping

## mapInput

**Signature**

```ts
export declare const mapInput: {
  <B, A>(f: (b: B) => A): (self: Equivalence<A>) => Equivalence<B>
  <A, B>(self: Equivalence<A>, f: (b: B) => A): Equivalence<B>
}
```

Added in v2.0.0

# type class

## Equivalence (interface)

**Signature**

```ts
export interface Equivalence<in A> {
  (self: A, that: A): boolean
}
```

Added in v2.0.0

# type lambdas

## EquivalenceTypeLambda (interface)

**Signature**

```ts
export interface EquivalenceTypeLambda extends TypeLambda {
  readonly type: Equivalence<this["Target"]>
}
```

Added in v2.0.0
