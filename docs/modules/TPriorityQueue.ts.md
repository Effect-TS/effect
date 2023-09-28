---
title: TPriorityQueue.ts
nav_order: 131
parent: Modules
---

## TPriorityQueue overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
  - [fromIterable](#fromiterable)
  - [make](#make)
- [destructors](#destructors)
  - [toArray](#toarray)
  - [toReadonlyArray](#toreadonlyarray)
- [getters](#getters)
  - [isEmpty](#isempty)
  - [isNonEmpty](#isnonempty)
  - [peek](#peek)
  - [peekOption](#peekoption)
  - [removeIf](#removeif)
  - [retainIf](#retainif)
  - [size](#size)
- [models](#models)
  - [TPriorityQueue (interface)](#tpriorityqueue-interface)
- [mutations](#mutations)
  - [offer](#offer)
  - [offerAll](#offerall)
  - [take](#take)
  - [takeAll](#takeall)
  - [takeOption](#takeoption)
  - [takeUpTo](#takeupto)
- [symbols](#symbols)
  - [TPriorityQueueTypeId](#tpriorityqueuetypeid)
  - [TPriorityQueueTypeId (type alias)](#tpriorityqueuetypeid-type-alias)
- [utils](#utils)
  - [TPriorityQueue (namespace)](#tpriorityqueue-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## empty

Constructs a new empty `TPriorityQueue` with the specified `Order`.

**Signature**

```ts
export declare const empty: <A>(order: Order.Order<A>) => STM.STM<never, never, TPriorityQueue<A>>
```

Added in v1.0.0

## fromIterable

Makes a new `TPriorityQueue` initialized with provided iterable.

**Signature**

```ts
export declare const fromIterable: <A>(
  order: Order.Order<A>
) => (iterable: Iterable<A>) => STM.STM<never, never, TPriorityQueue<A>>
```

Added in v1.0.0

## make

Makes a new `TPriorityQueue` that is initialized with specified values.

**Signature**

```ts
export declare const make: <A>(order: Order.Order<A>) => (...elements: A[]) => STM.STM<never, never, TPriorityQueue<A>>
```

Added in v1.0.0

# destructors

## toArray

Collects all values into a chunk.

**Signature**

```ts
export declare const toArray: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, A[]>
```

Added in v1.0.0

## toReadonlyArray

Collects all values into an array.

**Signature**

```ts
export declare const toReadonlyArray: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, readonly A[]>
```

Added in v1.0.0

# getters

## isEmpty

Checks whether the queue is empty.

**Signature**

```ts
export declare const isEmpty: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, boolean>
```

Added in v1.0.0

## isNonEmpty

Checks whether the queue is not empty.

**Signature**

```ts
export declare const isNonEmpty: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, boolean>
```

Added in v1.0.0

## peek

Peeks at the first value in the queue without removing it, retrying until a
value is in the queue.

**Signature**

```ts
export declare const peek: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, A>
```

Added in v1.0.0

## peekOption

Peeks at the first value in the queue without removing it, returning `None`
if there is not a value in the queue.

**Signature**

```ts
export declare const peekOption: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, Option.Option<A>>
```

Added in v1.0.0

## removeIf

Removes all elements from the queue matching the specified predicate.

**Signature**

```ts
export declare const removeIf: {
  <A>(predicate: Predicate<A>): (self: TPriorityQueue<A>) => STM.STM<never, never, void>
  <A>(self: TPriorityQueue<A>, predicate: Predicate<A>): STM.STM<never, never, void>
}
```

Added in v1.0.0

## retainIf

Retains only elements from the queue matching the specified predicate.

**Signature**

```ts
export declare const retainIf: {
  <A>(predicate: Predicate<A>): (self: TPriorityQueue<A>) => STM.STM<never, never, void>
  <A>(self: TPriorityQueue<A>, predicate: Predicate<A>): STM.STM<never, never, void>
}
```

Added in v1.0.0

## size

Returns the size of the queue.

**Signature**

```ts
export declare const size: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, number>
```

Added in v1.0.0

# models

## TPriorityQueue (interface)

A `TPriorityQueue` contains values of type `A` that an `Order` is defined
on. Unlike a `TQueue`, `take` returns the highest priority value (the value
that is first in the specified ordering) as opposed to the first value
offered to the queue. The ordering that elements with the same priority will
be taken from the queue is not guaranteed.

**Signature**

```ts
export interface TPriorityQueue<A> extends TPriorityQueue.Variance<A> {}
```

Added in v1.0.0

# mutations

## offer

Offers the specified value to the queue.

**Signature**

```ts
export declare const offer: {
  <A>(value: A): (self: TPriorityQueue<A>) => STM.STM<never, never, void>
  <A>(self: TPriorityQueue<A>, value: A): STM.STM<never, never, void>
}
```

Added in v1.0.0

## offerAll

Offers all of the elements in the specified collection to the queue.

**Signature**

```ts
export declare const offerAll: {
  <A>(values: Iterable<A>): (self: TPriorityQueue<A>) => STM.STM<never, never, void>
  <A>(self: TPriorityQueue<A>, values: Iterable<A>): STM.STM<never, never, void>
}
```

Added in v1.0.0

## take

Takes a value from the queue, retrying until a value is in the queue.

**Signature**

```ts
export declare const take: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, A>
```

Added in v1.0.0

## takeAll

Takes all values from the queue.

**Signature**

```ts
export declare const takeAll: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, A[]>
```

Added in v1.0.0

## takeOption

Takes a value from the queue, returning `None` if there is not a value in
the queue.

**Signature**

```ts
export declare const takeOption: <A>(self: TPriorityQueue<A>) => STM.STM<never, never, Option.Option<A>>
```

Added in v1.0.0

## takeUpTo

Takes up to the specified maximum number of elements from the queue.

**Signature**

```ts
export declare const takeUpTo: {
  (n: number): <A>(self: TPriorityQueue<A>) => STM.STM<never, never, A[]>
  <A>(self: TPriorityQueue<A>, n: number): STM.STM<never, never, A[]>
}
```

Added in v1.0.0

# symbols

## TPriorityQueueTypeId

**Signature**

```ts
export declare const TPriorityQueueTypeId: typeof TPriorityQueueTypeId
```

Added in v1.0.0

## TPriorityQueueTypeId (type alias)

**Signature**

```ts
export type TPriorityQueueTypeId = typeof TPriorityQueueTypeId
```

Added in v1.0.0

# utils

## TPriorityQueue (namespace)

Added in v1.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [TPriorityQueueTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v1.0.0
