---
title: Boolean.ts
nav_order: 2
parent: Modules
---

## Boolean overview

This module provides utility functions and type class instances for working with the `boolean` type in TypeScript.
It includes functions for basic boolean operations, as well as type class instances for
`Equivalence`, `Order`, `Semigroup`, and `Monoid`.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combinators](#combinators)
  - [and](#and)
  - [eqv](#eqv)
  - [implies](#implies)
  - [nand](#nand)
  - [nor](#nor)
  - [not](#not)
  - [or](#or)
  - [xor](#xor)
- [guards](#guards)
  - [isBoolean](#isboolean)
- [instances](#instances)
  - [Equivalence](#equivalence)
  - [Order](#order)
- [pattern matching](#pattern-matching)
  - [match](#match)
- [utils](#utils)
  - [every](#every)
  - [some](#some)

---

# combinators

## and

Combines two boolean using AND: `self && that`.

**Signature**

```ts
export declare const and: { (that: boolean): (self: boolean) => boolean; (self: boolean, that: boolean): boolean }
```

**Example**

```ts
import { and } from 'effect/Boolean'

assert.deepStrictEqual(and(true, true), true)
assert.deepStrictEqual(and(true, false), false)
assert.deepStrictEqual(and(false, true), false)
assert.deepStrictEqual(and(false, false), false)
```

Added in v2.0.0

## eqv

Combines two booleans using EQV (aka XNOR): `!xor(self, that)`.

**Signature**

```ts
export declare const eqv: { (that: boolean): (self: boolean) => boolean; (self: boolean, that: boolean): boolean }
```

**Example**

```ts
import { eqv } from 'effect/Boolean'

assert.deepStrictEqual(eqv(true, true), true)
assert.deepStrictEqual(eqv(true, false), false)
assert.deepStrictEqual(eqv(false, true), false)
assert.deepStrictEqual(eqv(false, false), true)
```

Added in v2.0.0

## implies

Combines two booleans using an implication: `(!self || that)`.

**Signature**

```ts
export declare const implies: { (that: boolean): (self: boolean) => boolean; (self: boolean, that: boolean): boolean }
```

**Example**

```ts
import { implies } from 'effect/Boolean'

assert.deepStrictEqual(implies(true, true), true)
assert.deepStrictEqual(implies(true, false), false)
assert.deepStrictEqual(implies(false, true), true)
assert.deepStrictEqual(implies(false, false), true)
```

Added in v2.0.0

## nand

Combines two boolean using NAND: `!(self && that)`.

**Signature**

```ts
export declare const nand: { (that: boolean): (self: boolean) => boolean; (self: boolean, that: boolean): boolean }
```

**Example**

```ts
import { nand } from 'effect/Boolean'

assert.deepStrictEqual(nand(true, true), false)
assert.deepStrictEqual(nand(true, false), true)
assert.deepStrictEqual(nand(false, true), true)
assert.deepStrictEqual(nand(false, false), true)
```

Added in v2.0.0

## nor

Combines two booleans using NOR: `!(self || that)`.

**Signature**

```ts
export declare const nor: { (that: boolean): (self: boolean) => boolean; (self: boolean, that: boolean): boolean }
```

**Example**

```ts
import { nor } from 'effect/Boolean'

assert.deepStrictEqual(nor(true, true), false)
assert.deepStrictEqual(nor(true, false), false)
assert.deepStrictEqual(nor(false, true), false)
assert.deepStrictEqual(nor(false, false), true)
```

Added in v2.0.0

## not

Negates the given boolean: `!self`

**Signature**

```ts
export declare const not: (self: boolean) => boolean
```

**Example**

```ts
import { not } from 'effect/Boolean'

assert.deepStrictEqual(not(true), false)
assert.deepStrictEqual(not(false), true)
```

Added in v2.0.0

## or

Combines two boolean using OR: `self || that`.

**Signature**

```ts
export declare const or: { (that: boolean): (self: boolean) => boolean; (self: boolean, that: boolean): boolean }
```

**Example**

```ts
import { or } from 'effect/Boolean'

assert.deepStrictEqual(or(true, true), true)
assert.deepStrictEqual(or(true, false), true)
assert.deepStrictEqual(or(false, true), true)
assert.deepStrictEqual(or(false, false), false)
```

Added in v2.0.0

## xor

Combines two booleans using XOR: `(!self && that) || (self && !that)`.

**Signature**

```ts
export declare const xor: { (that: boolean): (self: boolean) => boolean; (self: boolean, that: boolean): boolean }
```

**Example**

```ts
import { xor } from 'effect/Boolean'

assert.deepStrictEqual(xor(true, true), false)
assert.deepStrictEqual(xor(true, false), true)
assert.deepStrictEqual(xor(false, true), true)
assert.deepStrictEqual(xor(false, false), false)
```

Added in v2.0.0

# guards

## isBoolean

Tests if a value is a `boolean`.

**Signature**

```ts
export declare const isBoolean: (input: unknown) => input is boolean
```

**Example**

```ts
import { isBoolean } from 'effect/Boolean'

assert.deepStrictEqual(isBoolean(true), true)
assert.deepStrictEqual(isBoolean('true'), false)
```

Added in v2.0.0

# instances

## Equivalence

**Signature**

```ts
export declare const Equivalence: equivalence.Equivalence<boolean>
```

Added in v2.0.0

## Order

**Signature**

```ts
export declare const Order: order.Order<boolean>
```

Added in v2.0.0

# pattern matching

## match

This function returns the result of either of the given functions depending on the value of the boolean parameter.
It is useful when you have to run one of two functions depending on the boolean value.

**Signature**

```ts
export declare const match: {
  <A, B = A>(options: { readonly onFalse: LazyArg<A>; readonly onTrue: LazyArg<B> }): (value: boolean) => A | B
  <A, B>(value: boolean, options: { readonly onFalse: LazyArg<A>; readonly onTrue: LazyArg<B> }): A | B
}
```

**Example**

```ts
import * as B from 'effect/Boolean'

assert.deepStrictEqual(B.match(true, { onFalse: () => "It's false!", onTrue: () => "It's true!" }), "It's true!")
```

Added in v2.0.0

# utils

## every

This utility function is used to check if all the elements in a collection of boolean values are `true`.

**Signature**

```ts
export declare const every: (collection: Iterable<boolean>) => boolean
```

**Example**

```ts
import { every } from 'effect/Boolean'

assert.deepStrictEqual(every([true, true, true]), true)
assert.deepStrictEqual(every([true, false, true]), false)
```

Added in v2.0.0

## some

This utility function is used to check if at least one of the elements in a collection of boolean values is `true`.

**Signature**

```ts
export declare const some: (collection: Iterable<boolean>) => boolean
```

**Example**

```ts
import { some } from 'effect/Boolean'

assert.deepStrictEqual(some([true, false, true]), true)
assert.deepStrictEqual(some([false, false, false]), false)
```

Added in v2.0.0
