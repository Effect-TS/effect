---
title: Ordering.ts
nav_order: 78
parent: Modules
---

## Ordering overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [combining](#combining)
  - [combine](#combine)
  - [combineAll](#combineall)
  - [combineMany](#combinemany)
- [model](#model)
  - [Ordering (type alias)](#ordering-type-alias)
- [pattern matching](#pattern-matching)
  - [match](#match)
- [utils](#utils)
  - [reverse](#reverse)

---

# combining

## combine

**Signature**

```ts
export declare const combine: {
  (that: Ordering): (self: Ordering) => Ordering
  (self: Ordering, that: Ordering): Ordering
}
```

Added in v1.0.0

## combineAll

**Signature**

```ts
export declare const combineAll: (collection: Iterable<Ordering>) => Ordering
```

Added in v1.0.0

## combineMany

**Signature**

```ts
export declare const combineMany: {
  (collection: Iterable<Ordering>): (self: Ordering) => Ordering
  (self: Ordering, collection: Iterable<Ordering>): Ordering
}
```

Added in v1.0.0

# model

## Ordering (type alias)

**Signature**

```ts
export type Ordering = -1 | 0 | 1
```

Added in v1.0.0

# pattern matching

## match

Depending on the `Ordering` parameter given to it, returns a value produced by one of the 3 functions provided as parameters.

**Signature**

```ts
export declare const match: {
  <A, B, C = B>(options: {
    readonly onLessThan: LazyArg<A>
    readonly onEqual: LazyArg<B>
    readonly onGreaterThan: LazyArg<C>
  }): (self: Ordering) => A | B | C
  <A, B, C = B>(
    o: Ordering,
    options: { readonly onLessThan: LazyArg<A>; readonly onEqual: LazyArg<B>; readonly onGreaterThan: LazyArg<C> }
  ): A | B | C
}
```

**Example**

```ts
import { match } from 'effect/Ordering'
import { constant } from 'effect/Function'

const toMessage = match({
  onLessThan: constant('less than'),
  onEqual: constant('equal'),
  onGreaterThan: constant('greater than'),
})

assert.deepStrictEqual(toMessage(-1), 'less than')
assert.deepStrictEqual(toMessage(0), 'equal')
assert.deepStrictEqual(toMessage(1), 'greater than')
```

Added in v1.0.0

# utils

## reverse

Inverts the ordering of the input `Ordering`.

**Signature**

```ts
export declare const reverse: (o: Ordering) => Ordering
```

**Example**

```ts
import { reverse } from 'effect/Ordering'

assert.deepStrictEqual(reverse(1), -1)
assert.deepStrictEqual(reverse(-1), 1)
assert.deepStrictEqual(reverse(0), 0)
```

Added in v1.0.0
