---
title: Struct.ts
nav_order: 112
parent: Modules
---

## Struct overview

This module provides utility functions for working with structs in TypeScript.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [getEquivalence](#getequivalence)
  - [getOrder](#getorder)
- [utils](#utils)
  - [evolve](#evolve)
  - [omit](#omit)
  - [pick](#pick)

---

# combinators

## getEquivalence

Given a struct of `Equivalence`s returns a new `Equivalence` that compares values of a struct
by applying each `Equivalence` to the corresponding property of the struct.

Alias of {@link Equivalence.struct}.

**Signature**

```ts
export declare const getEquivalence: <R extends Record<string, Equivalence.Equivalence<any>>>(
  isEquivalents: R
) => Equivalence.Equivalence<{ readonly [K in keyof R]: [R[K]] extends [Equivalence.Equivalence<infer A>] ? A : never }>
```

**Example**

```ts
import { getEquivalence } from 'effect/Struct'
import * as S from 'effect/String'
import * as N from 'effect/Number'

const PersonEquivalence = getEquivalence({
  name: S.Equivalence,
  age: N.Equivalence,
})

assert.deepStrictEqual(PersonEquivalence({ name: 'John', age: 25 }, { name: 'John', age: 25 }), true)
assert.deepStrictEqual(PersonEquivalence({ name: 'John', age: 25 }, { name: 'John', age: 40 }), false)
```

Added in v2.0.0

## getOrder

This function creates and returns a new `Order` for a struct of values based on the given `Order`s
for each property in the struct.

Alias of {@link order.struct}.

**Signature**

```ts
export declare const getOrder: <R extends { readonly [x: string]: order.Order<any> }>(
  fields: R
) => order.Order<{ [K in keyof R]: [R[K]] extends [order.Order<infer A>] ? A : never }>
```

Added in v2.0.0

# utils

## evolve

Transforms the values of a Struct provided a transformation function for each key.
If no transformation function is provided for a key, it will return the origional value for that key.

**Signature**

```ts
export declare const evolve: {
  <O, T extends Partial<{ [K in keyof O]: (a: O[K]) => unknown }>>(t: T): (obj: O) => {
    [K in keyof O]: K extends keyof T ? (T[K] extends (...a: any) => any ? ReturnType<T[K]> : O[K]) : O[K]
  }
  <O, T extends Partial<{ [K in keyof O]: (a: O[K]) => unknown }>>(obj: O, t: T): {
    [K in keyof O]: K extends keyof T ? (T[K] extends (...a: any) => any ? ReturnType<T[K]> : O[K]) : O[K]
  }
}
```

**Example**

```ts
import { evolve } from 'effect/Struct'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(
  pipe(
    { a: 'a', b: 1, c: 3 },
    evolve({
      a: (a) => a.length,
      b: (b) => b * 2,
    })
  ),
  { a: 1, b: 2, c: 3 }
)
```

Added in v2.0.0

## omit

Create a new object by omitting properties of an existing object.

**Signature**

```ts
export declare const omit: <S, Keys extends readonly [keyof S, ...(keyof S)[]]>(
  ...keys: Keys
) => (s: S) => { [K in Exclude<keyof S, Keys[number]>]: S[K] }
```

**Example**

```ts
import { omit } from 'effect/Struct'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe({ a: 'a', b: 1, c: true }, omit('c')), { a: 'a', b: 1 })
```

Added in v2.0.0

## pick

Create a new object by picking properties of an existing object.

**Signature**

```ts
export declare const pick: <S, Keys extends readonly [keyof S, ...(keyof S)[]]>(
  ...keys: Keys
) => (s: S) => { [K in Keys[number]]: S[K] }
```

**Example**

```ts
import { pick } from 'effect/Struct'
import { pipe } from 'effect/Function'

assert.deepStrictEqual(pipe({ a: 'a', b: 1, c: true }, pick('a', 'b')), { a: 'a', b: 1 })
```

Added in v2.0.0
