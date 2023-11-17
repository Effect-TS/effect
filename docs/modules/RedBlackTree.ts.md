---
title: RedBlackTree.ts
nav_order: 84
parent: Modules
---

## RedBlackTree overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constants](#constants)
  - [Direction](#direction)
- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [elements](#elements)
  - [findAll](#findall)
  - [findFirst](#findfirst)
  - [getAt](#getat)
  - [has](#has)
- [folding](#folding)
  - [reduce](#reduce)
- [getters](#getters)
  - [first](#first)
  - [getOrder](#getorder)
  - [keys](#keys)
  - [keysReversed](#keysreversed)
  - [last](#last)
  - [size](#size)
  - [values](#values)
  - [valuesReversed](#valuesreversed)
- [models](#models)
  - [RedBlackTree (interface)](#redblacktree-interface)
- [refinements](#refinements)
  - [isRedBlackTree](#isredblacktree)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [traversing](#traversing)
  - [at](#at)
  - [atReversed](#atreversed)
  - [forEach](#foreach)
  - [forEachBetween](#foreachbetween)
  - [forEachGreaterThanEqual](#foreachgreaterthanequal)
  - [forEachLessThan](#foreachlessthan)
  - [greaterThan](#greaterthan)
  - [greaterThanEqual](#greaterthanequal)
  - [greaterThanEqualReversed](#greaterthanequalreversed)
  - [greaterThanReversed](#greaterthanreversed)
  - [lessThan](#lessthan)
  - [lessThanEqual](#lessthanequal)
  - [lessThanEqualReversed](#lessthanequalreversed)
  - [lessThanReversed](#lessthanreversed)
  - [reversed](#reversed)
- [utils](#utils)
  - [RedBlackTree (namespace)](#redblacktree-namespace)
    - [Direction (type alias)](#direction-type-alias)
  - [insert](#insert)
  - [removeFirst](#removefirst)

---

# constants

## Direction

**Signature**

```ts
export declare const Direction: { readonly Forward: RedBlackTree.Direction; readonly Backward: RedBlackTree.Direction }
```

Added in v2.0.0

# constructors

## empty

Creates an empty `RedBlackTree`.

**Signature**

```ts
export declare const empty: <K, V = never>(ord: Order<K>) => RedBlackTree<K, V>
```

Added in v2.0.0

## fromIterable

Constructs a new tree from an iterable of key-value pairs.

**Signature**

```ts
export declare const fromIterable: {
  <B>(ord: Order<B>): <K extends B, V>(entries: Iterable<readonly [K, V]>) => RedBlackTree<K, V>
  <K extends B, V, B>(entries: Iterable<readonly [K, V]>, ord: Order<B>): RedBlackTree<K, V>
}
```

Added in v2.0.0

## make

Constructs a new `RedBlackTree` from the specified entries.

**Signature**

```ts
export declare const make: <K>(
  ord: Order<K>
) => <Entries extends (readonly [K, any])[]>(
  ...entries: Entries
) => RedBlackTree<K, Entries[number] extends readonly [any, infer V] ? V : never>
```

Added in v2.0.0

# elements

## findAll

Finds all values in the tree associated with the specified key.

**Signature**

```ts
export declare const findAll: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Chunk<V>
  <K, V>(self: RedBlackTree<K, V>, key: K): Chunk<V>
}
```

Added in v2.0.0

## findFirst

Finds the first value in the tree associated with the specified key, if it exists.

**Signature**

```ts
export declare const findFirst: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Option<V>
  <K, V>(self: RedBlackTree<K, V>, key: K): Option<V>
}
```

Added in v2.0.0

## getAt

Returns the element at the specified index within the tree or `None` if the
specified index does not exist.

**Signature**

```ts
export declare const getAt: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Option<[K, V]>
}
```

Added in v2.0.0

## has

Finds the item with key, if it exists.

**Signature**

```ts
export declare const has: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => boolean
  <K, V>(self: RedBlackTree<K, V>, key: K): boolean
}
```

Added in v2.0.0

# folding

## reduce

Reduce a state over the entries of the tree.

**Signature**

```ts
export declare const reduce: {
  <Z, V, K>(zero: Z, f: (accumulator: Z, value: V, key: K) => Z): (self: RedBlackTree<K, V>) => Z
  <Z, V, K>(self: RedBlackTree<K, V>, zero: Z, f: (accumulator: Z, value: V, key: K) => Z): Z
}
```

Added in v2.0.0

# getters

## first

Returns the first entry in the tree, if it exists.

**Signature**

```ts
export declare const first: <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]>
```

Added in v2.0.0

## getOrder

Gets the `Order<K>` that the `RedBlackTree<K, V>` is using.

**Signature**

```ts
export declare const getOrder: <K, V>(self: RedBlackTree<K, V>) => Order<K>
```

Added in v2.0.0

## keys

Get all the keys present in the tree in order.

**Signature**

```ts
export declare const keys: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<K>
```

Added in v2.0.0

## keysReversed

Get all the keys present in the tree in reverse order.

**Signature**

```ts
export declare const keysReversed: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<K>
```

Added in v2.0.0

## last

Returns the last entry in the tree, if it exists.

**Signature**

```ts
export declare const last: <K, V>(self: RedBlackTree<K, V>) => Option<[K, V]>
```

Added in v2.0.0

## size

Returns the size of the tree.

**Signature**

```ts
export declare const size: <K, V>(self: RedBlackTree<K, V>) => number
```

Added in v2.0.0

## values

Get all values present in the tree in order.

**Signature**

```ts
export declare const values: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<V>
```

Added in v2.0.0

## valuesReversed

Get all values present in the tree in reverse order.

**Signature**

```ts
export declare const valuesReversed: <K, V>(self: RedBlackTree<K, V>) => IterableIterator<V>
```

Added in v2.0.0

# models

## RedBlackTree (interface)

A Red-Black Tree.

**Signature**

```ts
export interface RedBlackTree<in out Key, out Value> extends Iterable<[Key, Value]>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _Key: (_: Key) => Key
    readonly _Value: (_: never) => Value
  }
}
```

Added in v2.0.0

# refinements

## isRedBlackTree

**Signature**

```ts
export declare const isRedBlackTree: {
  <K, V>(u: Iterable<readonly [K, V]>): u is RedBlackTree<K, V>
  (u: unknown): u is RedBlackTree<unknown, unknown>
}
```

Added in v2.0.0

# symbol

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v2.0.0

# traversing

## at

Returns an iterator that points to the element at the specified index of the
tree.

**Note**: The iterator will run through elements in order.

**Signature**

```ts
export declare const at: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Iterable<[K, V]>
}
```

Added in v2.0.0

## atReversed

Returns an iterator that points to the element at the specified index of the
tree.

**Note**: The iterator will run through elements in reverse order.

**Signature**

```ts
export declare const atReversed: {
  (index: number): <K, V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, index: number): Iterable<[K, V]>
}
```

Added in v2.0.0

## forEach

Execute the specified function for each node of the tree, in order.

**Signature**

```ts
export declare const forEach: {
  <K, V>(f: (key: K, value: V) => void): (self: RedBlackTree<K, V>) => void
  <K, V>(self: RedBlackTree<K, V>, f: (key: K, value: V) => void): void
}
```

Added in v2.0.0

## forEachBetween

Visit each node of the tree in order with key lower than max and greater
than or equal to min.

**Signature**

```ts
export declare const forEachBetween: {
  <K, V>(options: {
    readonly min: K
    readonly max: K
    readonly body: (key: K, value: V) => void
  }): (self: RedBlackTree<K, V>) => void
  <K, V>(
    self: RedBlackTree<K, V>,
    options: { readonly min: K; readonly max: K; readonly body: (key: K, value: V) => void }
  ): void
}
```

Added in v2.0.0

## forEachGreaterThanEqual

Visit each node of the tree in order with key greater then or equal to max.

**Signature**

```ts
export declare const forEachGreaterThanEqual: {
  <K, V>(min: K, f: (key: K, value: V) => void): (self: RedBlackTree<K, V>) => void
  <K, V>(self: RedBlackTree<K, V>, min: K, f: (key: K, value: V) => void): void
}
```

Added in v2.0.0

## forEachLessThan

Visit each node of the tree in order with key lower then max.

**Signature**

```ts
export declare const forEachLessThan: {
  <K, V>(max: K, f: (key: K, value: V) => void): (self: RedBlackTree<K, V>) => void
  <K, V>(self: RedBlackTree<K, V>, max: K, f: (key: K, value: V) => void): void
}
```

Added in v2.0.0

## greaterThan

Returns an iterator that traverse entries in order with keys greater than the
specified key.

**Signature**

```ts
export declare const greaterThan: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
}
```

Added in v2.0.0

## greaterThanEqual

Returns an iterator that traverse entries in order with keys greater than or
equal to the specified key.

**Signature**

```ts
export declare const greaterThanEqual: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
}
```

Added in v2.0.0

## greaterThanEqualReversed

Returns an iterator that traverse entries in reverse order with keys greater
than or equal to the specified key.

**Signature**

```ts
export declare const greaterThanEqualReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
}
```

Added in v2.0.0

## greaterThanReversed

Returns an iterator that traverse entries in reverse order with keys greater
than the specified key.

**Signature**

```ts
export declare const greaterThanReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
}
```

Added in v2.0.0

## lessThan

Returns an iterator that traverse entries in order with keys less than the
specified key.

**Signature**

```ts
export declare const lessThan: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
}
```

Added in v2.0.0

## lessThanEqual

Returns an iterator that traverse entries in order with keys less than or
equal to the specified key.

**Signature**

```ts
export declare const lessThanEqual: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
}
```

Added in v2.0.0

## lessThanEqualReversed

Returns an iterator that traverse entries in reverse order with keys less
than or equal to the specified key.

**Signature**

```ts
export declare const lessThanEqualReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
}
```

Added in v2.0.0

## lessThanReversed

Returns an iterator that traverse entries in reverse order with keys less
than the specified key.

**Signature**

```ts
export declare const lessThanReversed: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
  <K, V>(self: RedBlackTree<K, V>, key: K): Iterable<[K, V]>
}
```

Added in v2.0.0

## reversed

Traverse the tree in reverse order.

**Signature**

```ts
export declare const reversed: <K, V>(self: RedBlackTree<K, V>) => Iterable<[K, V]>
```

Added in v2.0.0

# utils

## RedBlackTree (namespace)

Added in v2.0.0

### Direction (type alias)

**Signature**

```ts
export type Direction = number & {
  readonly Direction: unique symbol
}
```

Added in v2.0.0

## insert

Insert a new item into the tree.

**Signature**

```ts
export declare const insert: {
  <K, V>(key: K, value: V): (self: RedBlackTree<K, V>) => RedBlackTree<K, V>
  <K, V>(self: RedBlackTree<K, V>, key: K, value: V): RedBlackTree<K, V>
}
```

Added in v2.0.0

## removeFirst

Removes the entry with the specified key, if it exists.

**Signature**

```ts
export declare const removeFirst: {
  <K>(key: K): <V>(self: RedBlackTree<K, V>) => RedBlackTree<K, V>
  <K, V>(self: RedBlackTree<K, V>, key: K): RedBlackTree<K, V>
}
```

Added in v2.0.0
