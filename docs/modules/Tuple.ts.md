---
title: Tuple.ts
nav_order: 139
parent: Modules
---

## Tuple overview

This module provides utility functions for working with tuples in TypeScript.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [getEquivalence](#getequivalence)
  - [getOrder](#getorder)
- [concatenating](#concatenating)
  - [appendElement](#appendelement)
- [constructors](#constructors)
  - [tuple](#tuple)
- [getters](#getters)
  - [getFirst](#getfirst)
  - [getSecond](#getsecond)
- [mapping](#mapping)
  - [mapBoth](#mapboth)
  - [mapFirst](#mapfirst)
  - [mapSecond](#mapsecond)
- [type lambdas](#type-lambdas)
  - [TupleTypeLambda (interface)](#tupletypelambda-interface)
- [utils](#utils)
  - [swap](#swap)

---

# combinators

## getEquivalence

Given a tuple of `Equivalence`s returns a new `Equivalence` that compares values of a tuple
by applying each `Equivalence` to the corresponding element of the tuple.

**Signature**

```ts
export declare const getEquivalence: <T extends readonly Equivalence.Equivalence<any>[]>(
  ...isEquivalents: T
) => Equivalence.Equivalence<
  Readonly<{ [I in keyof T]: [T[I]] extends [Equivalence.Equivalence<infer A>] ? A : never }>
>
```

Added in v2.0.0

## getOrder

This function creates and returns a new `Order` for a tuple of values based on the given `Order`s for each element in the tuple.
The returned `Order` compares two tuples of the same type by applying the corresponding `Order` to each element in the tuple.
It is useful when you need to compare two tuples of the same type and you have a specific way of comparing each element
of the tuple.

**Signature**

```ts
export declare const getOrder: <T extends readonly order.Order<any>[]>(
  ...elements: T
) => order.Order<{ [I in keyof T]: [T[I]] extends [order.Order<infer A>] ? A : never }>
```

Added in v2.0.0

# concatenating

## appendElement

Appends an element to the end of a tuple.

**Signature**

```ts
export declare const appendElement: {
  <B>(that: B): <A extends readonly unknown[]>(self: A) => [...A, B]
  <A extends readonly unknown[], B>(self: A, that: B): [...A, B]
}
```

Added in v2.0.0

# constructors

## tuple

Constructs a new tuple from the provided values.

**Signature**

```ts
export declare const tuple: <A extends readonly any[]>(...elements: A) => A
```

**Example**

```ts
import { tuple } from "effect/Tuple"

assert.deepStrictEqual(tuple(1, "hello", true), [1, "hello", true])
```

Added in v2.0.0

# getters

## getFirst

Return the first element of a tuple.

**Signature**

```ts
export declare const getFirst: <L, R>(self: readonly [L, R]) => L
```

**Example**

```ts
import { getFirst } from "effect/Tuple"

assert.deepStrictEqual(getFirst(["hello", 42]), "hello")
```

Added in v2.0.0

## getSecond

Return the second element of a tuple.

**Signature**

```ts
export declare const getSecond: <L, R>(self: readonly [L, R]) => R
```

**Example**

```ts
import { getSecond } from "effect/Tuple"

assert.deepStrictEqual(getSecond(["hello", 42]), 42)
```

Added in v2.0.0

# mapping

## mapBoth

Transforms both elements of a tuple using the given functions.

**Signature**

```ts
export declare const mapBoth: {
  <L1, L2, R1, R2>(options: {
    readonly onFirst: (e: L1) => L2
    readonly onSecond: (a: R1) => R2
  }): (self: readonly [L1, R1]) => [L2, R2]
  <L1, R1, L2, R2>(
    self: readonly [L1, R1],
    options: { readonly onFirst: (e: L1) => L2; readonly onSecond: (a: R1) => R2 }
  ): [L2, R2]
}
```

**Example**

```ts
import { mapBoth } from "effect/Tuple"

assert.deepStrictEqual(mapBoth(["hello", 42], { onFirst: (s) => s.toUpperCase(), onSecond: (n) => n.toString() }), [
  "HELLO",
  "42"
])
```

Added in v2.0.0

## mapFirst

Transforms the first component of a tuple using a given function.

**Signature**

```ts
export declare const mapFirst: {
  <L1, L2>(f: (left: L1) => L2): <R>(self: readonly [L1, R]) => [L2, R]
  <L1, R, L2>(self: readonly [L1, R], f: (left: L1) => L2): [L2, R]
}
```

**Example**

```ts
import { mapFirst } from "effect/Tuple"

assert.deepStrictEqual(
  mapFirst(["hello", 42], (s) => s.toUpperCase()),
  ["HELLO", 42]
)
```

Added in v2.0.0

## mapSecond

Transforms the second component of a tuple using a given function.

**Signature**

```ts
export declare const mapSecond: {
  <R1, R2>(f: (right: R1) => R2): <L>(self: readonly [L, R1]) => [L, R2]
  <L, R1, R2>(self: readonly [L, R1], f: (right: R1) => R2): [L, R2]
}
```

**Example**

```ts
import { mapSecond } from "effect/Tuple"

assert.deepStrictEqual(
  mapSecond(["hello", 42], (n) => n.toString()),
  ["hello", "42"]
)
```

Added in v2.0.0

# type lambdas

## TupleTypeLambda (interface)

**Signature**

```ts
export interface TupleTypeLambda extends TypeLambda {
  readonly type: [this["Out1"], this["Target"]]
}
```

Added in v2.0.0

# utils

## swap

Swaps the two elements of a tuple.

**Signature**

```ts
export declare const swap: <L, R>(self: readonly [L, R]) => [R, L]
```

**Example**

```ts
import { swap } from "effect/Tuple"

assert.deepStrictEqual(swap(["hello", 42]), [42, "hello"])
```

Added in v2.0.0
