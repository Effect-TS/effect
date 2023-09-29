---
title: MutableQueue.ts
nav_order: 72
parent: Modules
---

## MutableQueue overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [bounded](#bounded)
  - [unbounded](#unbounded)
- [getters](#getters)
  - [capacity](#capacity)
  - [isEmpty](#isempty)
  - [isFull](#isfull)
  - [length](#length)
- [model](#model)
  - [MutableQueue (interface)](#mutablequeue-interface)
- [symbol](#symbol)
  - [EmptyMutableQueue](#emptymutablequeue)
  - [TypeId (type alias)](#typeid-type-alias)
- [utils](#utils)
  - [MutableQueue (namespace)](#mutablequeue-namespace)
    - [Empty (type alias)](#empty-type-alias)
  - [offer](#offer)
  - [offerAll](#offerall)
  - [poll](#poll)
  - [pollUpTo](#pollupto)

---

# constructors

## bounded

Creates a new bounded `MutableQueue`.

**Signature**

```ts
export declare const bounded: <A>(capacity: number) => MutableQueue<A>
```

Added in v1.0.0

## unbounded

Creates a new unbounded `MutableQueue`.

**Signature**

```ts
export declare const unbounded: <A>() => MutableQueue<A>
```

Added in v1.0.0

# getters

## capacity

The **maximum** number of elements that a queue can hold.

**Note**: unbounded queues can still implement this interface with
`capacity = Infinity`.

**Signature**

```ts
export declare const capacity: <A>(self: MutableQueue<A>) => number
```

Added in v1.0.0

## isEmpty

Returns `true` if the queue is empty, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: <A>(self: MutableQueue<A>) => boolean
```

Added in v1.0.0

## isFull

Returns `true` if the queue is full, `false` otherwise.

**Signature**

```ts
export declare const isFull: <A>(self: MutableQueue<A>) => boolean
```

Added in v1.0.0

## length

Returns the current number of elements in the queue.

**Signature**

```ts
export declare const length: <A>(self: MutableQueue<A>) => number
```

Added in v1.0.0

# model

## MutableQueue (interface)

**Signature**

```ts
export interface MutableQueue<A> extends Iterable<A>, Pipeable, Inspectable {
  readonly [TypeId]: TypeId

  /** @internal */
  queue: MutableList.MutableList<A>
  /** @internal */
  capacity: number | undefined
}
```

Added in v1.0.0

# symbol

## EmptyMutableQueue

**Signature**

```ts
export declare const EmptyMutableQueue: typeof EmptyMutableQueue
```

Added in v1.0.0

## TypeId (type alias)

**Signature**

```ts
export type TypeId = typeof TypeId
```

Added in v1.0.0

# utils

## MutableQueue (namespace)

Added in v1.0.0

### Empty (type alias)

**Signature**

```ts
export type Empty = typeof EmptyMutableQueue
```

Added in v1.0.0

## offer

Offers an element to the queue.

Returns whether the enqueue was successful or not.

**Signature**

```ts
export declare const offer: {
  <A>(self: MutableQueue<A>, value: A): boolean
  <A>(value: A): (self: MutableQueue<A>) => boolean
}
```

Added in v1.0.0

## offerAll

Enqueues a collection of values into the queue.

Returns a `Chunk` of the values that were **not** able to be enqueued.

**Signature**

```ts
export declare const offerAll: {
  <A>(values: Iterable<A>): (self: MutableQueue<A>) => Chunk.Chunk<A>
  <A>(self: MutableQueue<A>, values: Iterable<A>): Chunk.Chunk<A>
}
```

Added in v1.0.0

## poll

Dequeues an element from the queue.

Returns either an element from the queue, or the `def` param.

**Note**: if there is no meaningful default for your type, you can always
use `poll(MutableQueue.EmptyMutableQueue)`.

**Signature**

```ts
export declare const poll: {
  <D>(def: D): <A>(self: MutableQueue<A>) => D | A
  <A, D>(self: MutableQueue<A>, def: D): A | D
}
```

Added in v1.0.0

## pollUpTo

Dequeues up to `n` elements from the queue.

Returns a `List` of up to `n` elements.

**Signature**

```ts
export declare const pollUpTo: {
  (n: number): <A>(self: MutableQueue<A>) => Chunk.Chunk<A>
  <A>(self: MutableQueue<A>, n: number): Chunk.Chunk<A>
}
```

Added in v1.0.0
