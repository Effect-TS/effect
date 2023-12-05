---
title: TSet.ts
nav_order: 139
parent: Modules
---

## TSet overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [destructors](#destructors)
  - [toArray](#toarray)
  - [toChunk](#tochunk)
  - [toHashSet](#tohashset)
  - [toReadonlySet](#toreadonlyset)
- [elements](#elements)
  - [forEach](#foreach)
  - [has](#has)
- [folding](#folding)
  - [reduce](#reduce)
  - [reduceSTM](#reducestm)
- [getters](#getters)
  - [isEmpty](#isempty)
  - [size](#size)
- [models](#models)
  - [TSet (interface)](#tset-interface)
- [mutations](#mutations)
  - [add](#add)
  - [difference](#difference)
  - [intersection](#intersection)
  - [remove](#remove)
  - [removeAll](#removeall)
  - [removeIf](#removeif)
  - [retainIf](#retainif)
  - [takeFirst](#takefirst)
  - [takeFirstSTM](#takefirststm)
  - [takeSome](#takesome)
  - [takeSomeSTM](#takesomestm)
  - [transform](#transform)
  - [transformSTM](#transformstm)
  - [union](#union)
- [symbols](#symbols)
  - [TSetTypeId](#tsettypeid)
  - [TSetTypeId (type alias)](#tsettypeid-type-alias)
- [utils](#utils)
  - [TSet (namespace)](#tset-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## empty

Makes an empty `TSet`.

**Signature**

```ts
export declare const empty: <A>() => STM.STM<never, never, TSet<A>>
```

Added in v2.0.0

## fromIterable

Creates a new `TSet` from an iterable collection of values.

**Signature**

```ts
export declare const fromIterable: <A>(iterable: Iterable<A>) => STM.STM<never, never, TSet<A>>
```

Added in v2.0.0

## make

Makes a new `TSet` that is initialized with specified values.

**Signature**

```ts
export declare const make: <Elements extends any[]>(
  ...elements: Elements
) => STM.STM<never, never, TSet<Elements[number]>>
```

Added in v2.0.0

# destructors

## toArray

Collects all elements into a `Array`.

**Signature**

```ts
export declare const toArray: <A>(self: TSet<A>) => STM.STM<never, never, A[]>
```

Added in v2.0.0

## toChunk

Collects all elements into a `Chunk`.

**Signature**

```ts
export declare const toChunk: <A>(self: TSet<A>) => STM.STM<never, never, Chunk.Chunk<A>>
```

Added in v2.0.0

## toHashSet

Collects all elements into a `HashSet`.

**Signature**

```ts
export declare const toHashSet: <A>(self: TSet<A>) => STM.STM<never, never, HashSet.HashSet<A>>
```

Added in v2.0.0

## toReadonlySet

Collects all elements into a `ReadonlySet`.

**Signature**

```ts
export declare const toReadonlySet: <A>(self: TSet<A>) => STM.STM<never, never, ReadonlySet<A>>
```

Added in v2.0.0

# elements

## forEach

Atomically performs transactional-effect for each element in set.

**Signature**

```ts
export declare const forEach: {
  <A, R, E>(f: (value: A) => STM.STM<R, E, void>): (self: TSet<A>) => STM.STM<R, E, void>
  <A, R, E>(self: TSet<A>, f: (value: A) => STM.STM<R, E, void>): STM.STM<R, E, void>
}
```

Added in v2.0.0

## has

Tests whether or not set contains an element.

**Signature**

```ts
export declare const has: {
  <A>(value: A): (self: TSet<A>) => STM.STM<never, never, boolean>
  <A>(self: TSet<A>, value: A): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

# folding

## reduce

Atomically folds using a pure function.

**Signature**

```ts
export declare const reduce: {
  <Z, A>(zero: Z, f: (accumulator: Z, value: A) => Z): (self: TSet<A>) => STM.STM<never, never, Z>
  <Z, A>(self: TSet<A>, zero: Z, f: (accumulator: Z, value: A) => Z): STM.STM<never, never, Z>
}
```

Added in v2.0.0

## reduceSTM

Atomically folds using a transactional function.

**Signature**

```ts
export declare const reduceSTM: {
  <Z, A, R, E>(zero: Z, f: (accumulator: Z, value: A) => STM.STM<R, E, Z>): (self: TSet<A>) => STM.STM<R, E, Z>
  <Z, A, R, E>(self: TSet<A>, zero: Z, f: (accumulator: Z, value: A) => STM.STM<R, E, Z>): STM.STM<R, E, Z>
}
```

Added in v2.0.0

# getters

## isEmpty

Tests if the set is empty or not

**Signature**

```ts
export declare const isEmpty: <A>(self: TSet<A>) => STM.STM<never, never, boolean>
```

Added in v2.0.0

## size

Returns the set's cardinality.

**Signature**

```ts
export declare const size: <A>(self: TSet<A>) => STM.STM<never, never, number>
```

Added in v2.0.0

# models

## TSet (interface)

Transactional set implemented on top of `TMap`.

**Signature**

```ts
export interface TSet<in out A> extends TSet.Variance<A> {}
```

Added in v2.0.0

# mutations

## add

Stores new element in the set.

**Signature**

```ts
export declare const add: {
  <A>(value: A): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(self: TSet<A>, value: A): STM.STM<never, never, void>
}
```

Added in v2.0.0

## difference

Atomically transforms the set into the difference of itself and the
provided set.

**Signature**

```ts
export declare const difference: {
  <A>(other: TSet<A>): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(self: TSet<A>, other: TSet<A>): STM.STM<never, never, void>
}
```

Added in v2.0.0

## intersection

Atomically transforms the set into the intersection of itself and the
provided set.

**Signature**

```ts
export declare const intersection: {
  <A>(other: TSet<A>): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(self: TSet<A>, other: TSet<A>): STM.STM<never, never, void>
}
```

Added in v2.0.0

## remove

Removes a single element from the set.

**Signature**

```ts
export declare const remove: {
  <A>(value: A): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(self: TSet<A>, value: A): STM.STM<never, never, void>
}
```

Added in v2.0.0

## removeAll

Removes elements from the set.

**Signature**

```ts
export declare const removeAll: {
  <A>(iterable: Iterable<A>): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(self: TSet<A>, iterable: Iterable<A>): STM.STM<never, never, void>
}
```

Added in v2.0.0

## removeIf

Removes entries from a `TSet` that satisfy the specified predicate and returns the removed entries
(or `void` if `discard = true`).

**Signature**

```ts
export declare const removeIf: {
  <A>(predicate: Predicate<A>, options: { readonly discard: true }): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(predicate: Predicate<A>, options?: { readonly discard: false }): (self: TSet<A>) => STM.STM<never, never, A[]>
  <A>(self: TSet<A>, predicate: Predicate<A>, options: { readonly discard: true }): STM.STM<never, never, void>
  <A>(self: TSet<A>, predicate: Predicate<A>, options?: { readonly discard: false }): STM.STM<never, never, A[]>
}
```

Added in v2.0.0

## retainIf

Retains entries in a `TSet` that satisfy the specified predicate and returns the removed entries
(or `void` if `discard = true`).

**Signature**

```ts
export declare const retainIf: {
  <A>(predicate: Predicate<A>, options: { readonly discard: true }): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(predicate: Predicate<A>, options?: { readonly discard: false }): (self: TSet<A>) => STM.STM<never, never, A[]>
  <A>(self: TSet<A>, predicate: Predicate<A>, options: { readonly discard: true }): STM.STM<never, never, void>
  <A>(self: TSet<A>, predicate: Predicate<A>, options?: { readonly discard: false }): STM.STM<never, never, A[]>
}
```

Added in v2.0.0

## takeFirst

Takes the first matching value, or retries until there is one.

**Signature**

```ts
export declare const takeFirst: {
  <A, B>(pf: (a: A) => Option.Option<B>): (self: TSet<A>) => STM.STM<never, never, B>
  <A, B>(self: TSet<A>, pf: (a: A) => Option.Option<B>): STM.STM<never, never, B>
}
```

Added in v2.0.0

## takeFirstSTM

Takes the first matching value, or retries until there is one.

**Signature**

```ts
export declare const takeFirstSTM: {
  <A, R, E, B>(pf: (a: A) => STM.STM<R, Option.Option<E>, B>): (self: TSet<A>) => STM.STM<R, E, B>
  <A, R, E, B>(self: TSet<A>, pf: (a: A) => STM.STM<R, Option.Option<E>, B>): STM.STM<R, E, B>
}
```

Added in v2.0.0

## takeSome

Takes all matching values, or retries until there is at least one.

**Signature**

```ts
export declare const takeSome: {
  <A, B>(pf: (a: A) => Option.Option<B>): (self: TSet<A>) => STM.STM<never, never, [B, ...B[]]>
  <A, B>(self: TSet<A>, pf: (a: A) => Option.Option<B>): STM.STM<never, never, [B, ...B[]]>
}
```

Added in v2.0.0

## takeSomeSTM

Takes all matching values, or retries until there is at least one.

**Signature**

```ts
export declare const takeSomeSTM: {
  <A, R, E, B>(pf: (a: A) => STM.STM<R, Option.Option<E>, B>): (self: TSet<A>) => STM.STM<R, E, [B, ...B[]]>
  <A, R, E, B>(self: TSet<A>, pf: (a: A) => STM.STM<R, Option.Option<E>, B>): STM.STM<R, E, [B, ...B[]]>
}
```

Added in v2.0.0

## transform

Atomically updates all elements using a pure function.

**Signature**

```ts
export declare const transform: {
  <A>(f: (a: A) => A): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(self: TSet<A>, f: (a: A) => A): STM.STM<never, never, void>
}
```

Added in v2.0.0

## transformSTM

Atomically updates all elements using a transactional function.

**Signature**

```ts
export declare const transformSTM: {
  <A, R, E>(f: (a: A) => STM.STM<R, E, A>): (self: TSet<A>) => STM.STM<R, E, void>
  <A, R, E>(self: TSet<A>, f: (a: A) => STM.STM<R, E, A>): STM.STM<R, E, void>
}
```

Added in v2.0.0

## union

Atomically transforms the set into the union of itself and the provided
set.

**Signature**

```ts
export declare const union: {
  <A>(other: TSet<A>): (self: TSet<A>) => STM.STM<never, never, void>
  <A>(self: TSet<A>, other: TSet<A>): STM.STM<never, never, void>
}
```

Added in v2.0.0

# symbols

## TSetTypeId

**Signature**

```ts
export declare const TSetTypeId: typeof TSetTypeId
```

Added in v2.0.0

## TSetTypeId (type alias)

**Signature**

```ts
export type TSetTypeId = typeof TSetTypeId
```

Added in v2.0.0

# utils

## TSet (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<in out A> {
  readonly [TSetTypeId]: {
    readonly _A: Types.Invariant<A>
  }
}
```

Added in v2.0.0
