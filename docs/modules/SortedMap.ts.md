---
title: SortedMap.ts
nav_order: 104
parent: Modules
---

## SortedMap overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [elements](#elements)
  - [get](#get)
  - [has](#has)
  - [headOption](#headoption)
  - [remove](#remove)
  - [set](#set)
- [folding](#folding)
  - [reduce](#reduce)
- [getters](#getters)
  - [entries](#entries)
  - [getOrder](#getorder)
  - [keys](#keys)
  - [size](#size)
  - [values](#values)
- [mapping](#mapping)
  - [map](#map)
- [models](#models)
  - [SortedMap (interface)](#sortedmap-interface)
- [predicates](#predicates)
  - [isEmpty](#isempty)
  - [isNonEmpty](#isnonempty)
- [refinements](#refinements)
  - [isSortedMap](#issortedmap)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)

---

# constructors

## empty

**Signature**

```ts
export declare const empty: <K, V = never>(ord: Order<K>) => SortedMap<K, V>
```

Added in v2.0.0

## fromIterable

**Signature**

```ts
export declare const fromIterable: <K>(ord: Order<K>) => <V>(iterable: Iterable<readonly [K, V]>) => SortedMap<K, V>
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: <K>(
  ord: Order<K>
) => <Entries extends readonly (readonly [K, any])[]>(
  ...entries: Entries
) => SortedMap<K, Entries[number] extends readonly [any, infer V] ? V : never>
```

Added in v2.0.0

# elements

## get

**Signature**

```ts
export declare const get: {
  <K>(key: K): <V>(self: SortedMap<K, V>) => Option.Option<V>
  <K, V>(self: SortedMap<K, V>, key: K): Option.Option<V>
}
```

Added in v2.0.0

## has

**Signature**

```ts
export declare const has: {
  <K>(key: K): <V>(self: SortedMap<K, V>) => boolean
  <K, V>(self: SortedMap<K, V>, key: K): boolean
}
```

Added in v2.0.0

## headOption

**Signature**

```ts
export declare const headOption: <K, V>(self: SortedMap<K, V>) => Option.Option<readonly [K, V]>
```

Added in v2.0.0

## remove

**Signature**

```ts
export declare const remove: {
  <K>(key: K): <V>(self: SortedMap<K, V>) => SortedMap<K, V>
  <K, V>(self: SortedMap<K, V>, key: K): SortedMap<K, V>
}
```

Added in v2.0.0

## set

**Signature**

```ts
export declare const set: {
  <K, V>(key: K, value: V): (self: SortedMap<K, V>) => SortedMap<K, V>
  <K, V>(self: SortedMap<K, V>, key: K, value: V): SortedMap<K, V>
}
```

Added in v2.0.0

# folding

## reduce

**Signature**

```ts
export declare const reduce: {
  <B, A, K>(zero: B, f: (acc: B, value: A, key: K) => B): (self: SortedMap<K, A>) => B
  <K, A, B>(self: SortedMap<K, A>, zero: B, f: (acc: B, value: A, key: K) => B): B
}
```

Added in v2.0.0

# getters

## entries

**Signature**

```ts
export declare const entries: <K, V>(self: SortedMap<K, V>) => Iterator<readonly [K, V], any, undefined>
```

Added in v2.0.0

## getOrder

Gets the `Order<K>` that the `SortedMap<K, V>` is using.

**Signature**

```ts
export declare const getOrder: <K, V>(self: SortedMap<K, V>) => Order<K>
```

Added in v2.0.0

## keys

**Signature**

```ts
export declare const keys: <K, V>(self: SortedMap<K, V>) => IterableIterator<K>
```

Added in v2.0.0

## size

**Signature**

```ts
export declare const size: <K, V>(self: SortedMap<K, V>) => number
```

Added in v2.0.0

## values

**Signature**

```ts
export declare const values: <K, V>(self: SortedMap<K, V>) => IterableIterator<V>
```

Added in v2.0.0

# mapping

## map

**Signature**

```ts
export declare const map: {
  <A, K, B>(f: (a: A, k: K) => B): (self: SortedMap<K, A>) => SortedMap<K, B>
  <K, A, B>(self: SortedMap<K, A>, f: (a: A, k: K) => B): SortedMap<K, B>
}
```

Added in v2.0.0

# models

## SortedMap (interface)

**Signature**

```ts
export interface SortedMap<K, V> extends Iterable<readonly [K, V]>, Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
  /** @internal */
  readonly tree: RBT.RedBlackTree<K, V>
}
```

Added in v2.0.0

# predicates

## isEmpty

**Signature**

```ts
export declare const isEmpty: <K, V>(self: SortedMap<K, V>) => boolean
```

Added in v2.0.0

## isNonEmpty

**Signature**

```ts
export declare const isNonEmpty: <K, V>(self: SortedMap<K, V>) => boolean
```

Added in v2.0.0

# refinements

## isSortedMap

**Signature**

```ts
export declare const isSortedMap: {
  <K, V>(u: Iterable<readonly [K, V]>): u is SortedMap<K, V>
  (u: unknown): u is SortedMap<unknown, unknown>
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
