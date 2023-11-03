---
title: HashSet.ts
nav_order: 42
parent: Modules
---

## HashSet overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [elements](#elements)
  - [every](#every)
  - [has](#has)
  - [isSubset](#issubset)
  - [some](#some)
- [filtering](#filtering)
  - [filter](#filter)
- [folding](#folding)
  - [reduce](#reduce)
- [getters](#getters)
  - [size](#size)
  - [values](#values)
- [mapping](#mapping)
  - [map](#map)
- [models](#models)
  - [HashSet (interface)](#hashset-interface)
- [partitioning](#partitioning)
  - [partition](#partition)
- [refinements](#refinements)
  - [isHashSet](#ishashset)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
- [symbol](#symbol)
  - [TypeId (type alias)](#typeid-type-alias)
- [traversing](#traversing)
  - [forEach](#foreach)
- [utils](#utils)
  - [add](#add)
  - [beginMutation](#beginmutation)
  - [difference](#difference)
  - [endMutation](#endmutation)
  - [intersection](#intersection)
  - [mutate](#mutate)
  - [remove](#remove)
  - [toggle](#toggle)
  - [union](#union)

---

# constructors

## empty

Creates an empty `HashSet`.

**Signature**

```ts
export declare const empty: <A = never>() => HashSet<A>
```

Added in v2.0.0

## fromIterable

Construct a new `HashSet` from a `Collection` of values

**Signature**

```ts
export declare const fromIterable: <A>(elements: Iterable<A>) => HashSet<A>
```

Added in v2.0.0

## make

Construct a new `HashSet` from a variable number of values.

**Signature**

```ts
export declare const make: <As extends readonly any[]>(...elements: As) => HashSet<As[number]>
```

Added in v2.0.0

# elements

## every

Check if a predicate holds true for every `HashSet` element.

**Signature**

```ts
export declare const every: {
  <A, B extends A>(refinement: Refinement<A, B>): (self: HashSet<A>) => self is HashSet<B>
  <A>(predicate: Predicate<A>): (self: HashSet<A>) => boolean
  <A, B extends A>(self: HashSet<A>, refinement: Refinement<A, B>): self is HashSet<B>
  <A>(self: HashSet<A>, predicate: Predicate<A>): boolean
}
```

Added in v2.0.0

## has

Checks if the specified value exists in the `HashSet`.

**Signature**

```ts
export declare const has: { <A>(value: A): (self: HashSet<A>) => boolean; <A>(self: HashSet<A>, value: A): boolean }
```

Added in v2.0.0

## isSubset

Returns `true` if and only if every element in the this `HashSet` is an
element of the second set,

**NOTE**: the hash and equal of both sets must be the same.

**Signature**

```ts
export declare const isSubset: {
  <A>(that: HashSet<A>): (self: HashSet<A>) => boolean
  <A>(self: HashSet<A>, that: HashSet<A>): boolean
}
```

Added in v2.0.0

## some

Check if a predicate holds true for some `HashSet` element.

**Signature**

```ts
export declare const some: {
  <A>(f: Predicate<A>): (self: HashSet<A>) => boolean
  <A>(self: HashSet<A>, f: Predicate<A>): boolean
}
```

Added in v2.0.0

# filtering

## filter

Filters values out of a `HashSet` using the specified predicate.

**Signature**

```ts
export declare const filter: {
  <A, B extends A>(f: Refinement<A, B>): (self: HashSet<A>) => HashSet<B>
  <A>(f: Predicate<A>): (self: HashSet<A>) => HashSet<A>
  <A, B extends A>(self: HashSet<A>, f: Refinement<A, B>): HashSet<B>
  <A>(self: HashSet<A>, f: Predicate<A>): HashSet<A>
}
```

Added in v2.0.0

# folding

## reduce

Reduces the specified state over the values of the `HashSet`.

**Signature**

```ts
export declare const reduce: {
  <A, Z>(zero: Z, f: (accumulator: Z, value: A) => Z): (self: HashSet<A>) => Z
  <A, Z>(self: HashSet<A>, zero: Z, f: (accumulator: Z, value: A) => Z): Z
}
```

Added in v2.0.0

# getters

## size

Calculates the number of values in the `HashSet`.

**Signature**

```ts
export declare const size: <A>(self: HashSet<A>) => number
```

Added in v2.0.0

## values

Returns an `IterableIterator` of the values in the `HashSet`.

**Signature**

```ts
export declare const values: <A>(self: HashSet<A>) => IterableIterator<A>
```

Added in v2.0.0

# mapping

## map

Maps over the values of the `HashSet` using the specified function.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): (self: HashSet<A>) => HashSet<B>
  <A, B>(self: HashSet<A>, f: (a: A) => B): HashSet<B>
}
```

Added in v2.0.0

# models

## HashSet (interface)

**Signature**

```ts
export interface HashSet<A> extends Iterable<A>, Equal, Pipeable, Inspectable {
  readonly [TypeId]: TypeId
}
```

Added in v2.0.0

# partitioning

## partition

Partition the values of a `HashSet` using the specified predicate.

If a value matches the predicate, it will be placed into the `HashSet` on the
right side of the resulting `Tuple`, otherwise the value will be placed into
the left side.

**Signature**

```ts
export declare const partition: {
  <C extends A, B extends A, A = C>(
    refinement: Refinement<A, B>,
  ): (self: HashSet<C>) => [HashSet<Exclude<C, B>>, HashSet<B>]
  <B extends A, A = B>(predicate: (a: A) => boolean): (self: HashSet<B>) => [HashSet<B>, HashSet<B>]
  <C extends A, B extends A, A = C>(
    self: HashSet<C>,
    refinement: Refinement<A, B>,
  ): [HashSet<Exclude<C, B>>, HashSet<B>]
  <B extends A, A = B>(self: HashSet<B>, predicate: (a: A) => boolean): [HashSet<B>, HashSet<B>]
}
```

Added in v2.0.0

# refinements

## isHashSet

**Signature**

```ts
export declare const isHashSet: { <A>(u: Iterable<A>): u is HashSet<A>; (u: unknown): u is HashSet<unknown> }
```

Added in v2.0.0

# sequencing

## flatMap

Chains over the values of the `HashSet` using the specified function.

**Signature**

```ts
export declare const flatMap: {
  <A, B>(f: (a: A) => Iterable<B>): (self: HashSet<A>) => HashSet<B>
  <A, B>(self: HashSet<A>, f: (a: A) => Iterable<B>): HashSet<B>
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

## forEach

Applies the specified function to the values of the `HashSet`.

**Signature**

```ts
export declare const forEach: {
  <A>(f: (value: A) => void): (self: HashSet<A>) => void
  <A>(self: HashSet<A>, f: (value: A) => void): void
}
```

Added in v2.0.0

# utils

## add

Adds a value to the `HashSet`.

**Signature**

```ts
export declare const add: {
  <A>(value: A): (self: HashSet<A>) => HashSet<A>
  <A>(self: HashSet<A>, value: A): HashSet<A>
}
```

Added in v2.0.0

## beginMutation

Marks the `HashSet` as mutable.

**Signature**

```ts
export declare const beginMutation: <A>(self: HashSet<A>) => HashSet<A>
```

Added in v2.0.0

## difference

Computes the set difference between this `HashSet` and the specified
`Iterable<A>`.

**NOTE**: the hash and equal of the values in both the set and the iterable
must be the same.

**Signature**

```ts
export declare const difference: {
  <A>(that: Iterable<A>): (self: HashSet<A>) => HashSet<A>
  <A>(self: HashSet<A>, that: Iterable<A>): HashSet<A>
}
```

Added in v2.0.0

## endMutation

Marks the `HashSet` as immutable.

**Signature**

```ts
export declare const endMutation: <A>(self: HashSet<A>) => HashSet<A>
```

Added in v2.0.0

## intersection

Returns a `HashSet` of values which are present in both this set and that
`Iterable<A>`.

**NOTE**: the hash and equal of the values in both the set and the iterable
must be the same.

**Signature**

```ts
export declare const intersection: {
  <A>(that: Iterable<A>): (self: HashSet<A>) => HashSet<A>
  <A>(self: HashSet<A>, that: Iterable<A>): HashSet<A>
}
```

Added in v2.0.0

## mutate

Mutates the `HashSet` within the context of the provided function.

**Signature**

```ts
export declare const mutate: {
  <A>(f: (set: HashSet<A>) => void): (self: HashSet<A>) => HashSet<A>
  <A>(self: HashSet<A>, f: (set: HashSet<A>) => void): HashSet<A>
}
```

Added in v2.0.0

## remove

Removes a value from the `HashSet`.

**Signature**

```ts
export declare const remove: {
  <A>(value: A): (self: HashSet<A>) => HashSet<A>
  <A>(self: HashSet<A>, value: A): HashSet<A>
}
```

Added in v2.0.0

## toggle

Checks if a value is present in the `HashSet`. If it is present, the value
will be removed from the `HashSet`, otherwise the value will be added to the
`HashSet`.

**Signature**

```ts
export declare const toggle: {
  <A>(value: A): (self: HashSet<A>) => HashSet<A>
  <A>(self: HashSet<A>, value: A): HashSet<A>
}
```

Added in v2.0.0

## union

Computes the set union `(`self`+`that`)` between this `HashSet` and the
specified `Iterable<A>`.

**NOTE**: the hash and equal of the values in both the set and the iterable
must be the same.

**Signature**

```ts
export declare const union: {
  <A>(that: Iterable<A>): (self: HashSet<A>) => HashSet<A>
  <A>(self: HashSet<A>, that: Iterable<A>): HashSet<A>
}
```

Added in v2.0.0
