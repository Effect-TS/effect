---
title: SortedSet.ts
nav_order: 106
parent: Modules
---

## SortedSet overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [elements](#elements)
  - [add](#add)
  - [every](#every)
  - [has](#has)
  - [isSubset](#issubset)
  - [remove](#remove)
  - [some](#some)
  - [toggle](#toggle)
- [filtering](#filtering)
  - [filter](#filter)
  - [partition](#partition)
- [getters](#getters)
  - [size](#size)
  - [values](#values)
- [mapping](#mapping)
  - [map](#map)
- [models](#models)
  - [SortedSet (interface)](#sortedset-interface)
- [refinements](#refinements)
  - [isSortedSet](#issortedset)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [traversing](#traversing)
  - [forEach](#foreach)
- [utils](#utils)
  - [difference](#difference)
  - [intersection](#intersection)
  - [union](#union)

---

# constructors

## empty

**Signature**

```ts
export declare const empty: <A>(O: Order<A>) => SortedSet<A>
```

Added in v1.0.0

## fromIterable

**Signature**

```ts
export declare const fromIterable: <K>(ord: Order<K>) => (iterable: Iterable<K>) => SortedSet<K>
```

Added in v1.0.0

## make

**Signature**

```ts
export declare const make: <K>(
  ord: Order<K>
) => <Entries extends readonly K[]>(...entries: Entries) => SortedSet<Entries[number]>
```

Added in v1.0.0

# elements

## add

**Signature**

```ts
export declare const add: {
  <A>(value: A): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, value: A): SortedSet<A>
}
```

Added in v1.0.0

## every

Check if a predicate holds true for every `SortedSet` element.

**Signature**

```ts
export declare const every: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: SortedSet<A>) => self is SortedSet<B>
  <A>(predicate: Predicate<A>): (self: SortedSet<A>) => boolean
  <A, B extends A>(self: SortedSet<A>, refinement: Refinement<A, B>): self is SortedSet<B>
  <A>(self: SortedSet<A>, predicate: Predicate<A>): boolean
}
```

Added in v1.0.0

## has

**Signature**

```ts
export declare const has: { <A>(value: A): (self: SortedSet<A>) => boolean; <A>(self: SortedSet<A>, value: A): boolean }
```

Added in v1.0.0

## isSubset

**Signature**

```ts
export declare const isSubset: {
  <A>(that: SortedSet<A>): (self: SortedSet<A>) => boolean
  <A>(self: SortedSet<A>, that: SortedSet<A>): boolean
}
```

Added in v1.0.0

## remove

**Signature**

```ts
export declare const remove: {
  <A>(value: A): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, value: A): SortedSet<A>
}
```

Added in v1.0.0

## some

Check if a predicate holds true for some `SortedSet` element.

**Signature**

```ts
export declare const some: {
  <A>(predicate: Predicate<A>): (self: SortedSet<A>) => boolean
  <A>(self: SortedSet<A>, predicate: Predicate<A>): boolean
}
```

Added in v1.0.0

## toggle

**Signature**

```ts
export declare const toggle: {
  <A>(value: A): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, value: A): SortedSet<A>
}
```

Added in v1.0.0

# filtering

## filter

**Signature**

```ts
export declare const filter: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: SortedSet<A>) => SortedSet<B>
  <A>(predicate: Predicate<A>): (self: SortedSet<A>) => SortedSet<A>
  <A, B extends A>(self: SortedSet<A>, refinement: Refinement<A, B>): SortedSet<B>
  <A>(self: SortedSet<A>, predicate: Predicate<A>): SortedSet<A>
}
```

Added in v1.0.0

## partition

**Signature**

```ts
export declare const partition: {
  <C extends A, B extends A, A = C>(refinement: Refinement<A, B>): (
    self: SortedSet<C>
  ) => [SortedSet<Exclude<C, B>>, SortedSet<B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): (self: SortedSet<B>) => [SortedSet<B>, SortedSet<B>]
  <C extends A, B extends A, A = C>(self: SortedSet<C>, refinement: Refinement<A, B>): [
    SortedSet<Exclude<C, B>>,
    SortedSet<B>
  ]
  <B extends A, A = B>(self: SortedSet<B>, predicate: (a: A) => boolean): [SortedSet<B>, SortedSet<B>]
}
```

Added in v1.0.0

# getters

## size

**Signature**

```ts
export declare const size: <A>(self: SortedSet<A>) => number
```

Added in v1.0.0

## values

**Signature**

```ts
export declare const values: <A>(self: SortedSet<A>) => IterableIterator<A>
```

Added in v1.0.0

# mapping

## map

**Signature**

```ts
export declare const map: {
  <B, A>(O: Order<B>, f: (a: A) => B): (self: SortedSet<A>) => SortedSet<B>
  <B, A>(self: SortedSet<A>, O: Order<B>, f: (a: A) => B): SortedSet<B>
}
```

Added in v1.0.0

# models

## SortedSet (interface)

**Signature**

```ts
export interface SortedSet<A> extends Iterable<A>, Equal.Equal, Pipeable, Inspectable {
  readonly [TypeId]: {
    readonly _A: (_: never) => A
  }
  /** @internal */
  readonly keyTree: RBT.RedBlackTree<A, boolean>
}
```

Added in v1.0.0

# refinements

## isSortedSet

**Signature**

```ts
export declare const isSortedSet: { <A>(u: Iterable<A>): u is SortedSet<A>; (u: unknown): u is SortedSet<unknown> }
```

Added in v1.0.0

# sequencing

## flatMap

**Signature**

```ts
export declare const flatMap: {
  <B, A>(O: Order<B>, f: (a: A) => Iterable<B>): (self: SortedSet<A>) => SortedSet<B>
  <A, B>(self: SortedSet<A>, O: Order<B>, f: (a: A) => Iterable<B>): SortedSet<B>
}
```

Added in v1.0.0

# symbol

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v1.0.0

# traversing

## forEach

**Signature**

```ts
export declare const forEach: {
  <A>(f: (a: A) => void): (self: SortedSet<A>) => void
  <A>(self: SortedSet<A>, f: (a: A) => void): void
}
```

Added in v1.0.0

# utils

## difference

**Signature**

```ts
export declare const difference: {
  <A, B extends A>(that: Iterable<B>): (self: SortedSet<A>) => SortedSet<A>
  <A, B extends A>(self: SortedSet<A>, that: Iterable<B>): SortedSet<A>
}
```

Added in v1.0.0

## intersection

**Signature**

```ts
export declare const intersection: {
  <A>(that: Iterable<A>): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, that: Iterable<A>): SortedSet<A>
}
```

Added in v1.0.0

## union

**Signature**

```ts
export declare const union: {
  <A>(that: Iterable<A>): (self: SortedSet<A>) => SortedSet<A>
  <A>(self: SortedSet<A>, that: Iterable<A>): SortedSet<A>
}
```

Added in v1.0.0
