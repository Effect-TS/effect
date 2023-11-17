---
title: TQueue.ts
nav_order: 132
parent: Modules
---

## TQueue overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [bounded](#bounded)
  - [dropping](#dropping)
  - [sliding](#sliding)
  - [unbounded](#unbounded)
- [getters](#getters)
  - [capacity](#capacity)
  - [isEmpty](#isempty)
  - [isFull](#isfull)
  - [isShutdown](#isshutdown)
  - [peek](#peek)
  - [peekOption](#peekoption)
  - [poll](#poll)
  - [size](#size)
- [models](#models)
  - [BaseTQueue (interface)](#basetqueue-interface)
  - [TDequeue (interface)](#tdequeue-interface)
  - [TEnqueue (interface)](#tenqueue-interface)
  - [TQueue (interface)](#tqueue-interface)
- [mutations](#mutations)
  - [awaitShutdown](#awaitshutdown)
  - [offer](#offer)
  - [offerAll](#offerall)
  - [seek](#seek)
  - [shutdown](#shutdown)
  - [take](#take)
  - [takeAll](#takeall)
  - [takeBetween](#takebetween)
  - [takeN](#taken)
  - [takeUpTo](#takeupto)
- [refinements](#refinements)
  - [isTDequeue](#istdequeue)
  - [isTEnqueue](#istenqueue)
  - [isTQueue](#istqueue)
- [symbols](#symbols)
  - [TDequeueTypeId](#tdequeuetypeid)
  - [TDequeueTypeId (type alias)](#tdequeuetypeid-type-alias)
  - [TEnqueueTypeId](#tenqueuetypeid)
  - [TEnqueueTypeId (type alias)](#tenqueuetypeid-type-alias)
- [utils](#utils)
  - [TQueue (namespace)](#tqueue-namespace)
    - [TDequeueVariance (interface)](#tdequeuevariance-interface)
    - [TEnqueueVariance (interface)](#tenqueuevariance-interface)

---

# constructors

## bounded

Creates a bounded queue with the back pressure strategy. The queue will
retain values until they have been taken, applying back pressure to
offerors if the queue is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const bounded: <A>(requestedCapacity: number) => STM.STM<never, never, TQueue<A>>
```

Added in v2.0.0

## dropping

Creates a bounded queue with the dropping strategy. The queue will drop new
values if the queue is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const dropping: <A>(requestedCapacity: number) => STM.STM<never, never, TQueue<A>>
```

Added in v2.0.0

## sliding

Creates a bounded queue with the sliding strategy. The queue will add new
values and drop old values if the queue is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const sliding: <A>(requestedCapacity: number) => STM.STM<never, never, TQueue<A>>
```

Added in v2.0.0

## unbounded

Creates an unbounded queue.

**Signature**

```ts
export declare const unbounded: <A>() => STM.STM<never, never, TQueue<A>>
```

Added in v2.0.0

# getters

## capacity

Returns the number of elements the queue can hold.

**Signature**

```ts
export declare const capacity: <A>(self: TQueue<A>) => number
```

Added in v2.0.0

## isEmpty

Returns `true` if the `TQueue` contains zero elements, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: <A>(self: TQueue<A>) => STM.STM<never, never, boolean>
```

Added in v2.0.0

## isFull

Returns `true` if the `TQueue` contains at least one element, `false`
otherwise.

**Signature**

```ts
export declare const isFull: <A>(self: TQueue<A>) => STM.STM<never, never, boolean>
```

Added in v2.0.0

## isShutdown

Returns `true` if `shutdown` has been called, otherwise returns `false`.

**Signature**

```ts
export declare const isShutdown: <A>(self: TQueue<A>) => STM.STM<never, never, boolean>
```

Added in v2.0.0

## peek

Views the next element in the queue without removing it, retrying if the
queue is empty.

**Signature**

```ts
export declare const peek: <A>(self: TDequeue<A>) => STM.STM<never, never, A>
```

Added in v2.0.0

## peekOption

Views the next element in the queue without removing it, returning `None`
if the queue is empty.

**Signature**

```ts
export declare const peekOption: <A>(self: TDequeue<A>) => STM.STM<never, never, Option.Option<A>>
```

Added in v2.0.0

## poll

Takes a single element from the queue, returning `None` if the queue is
empty.

**Signature**

```ts
export declare const poll: <A>(self: TDequeue<A>) => STM.STM<never, never, Option.Option<A>>
```

Added in v2.0.0

## size

Retrieves the size of the queue, which is equal to the number of elements
in the queue. This may be negative if fibers are suspended waiting for
elements to be added to the queue.

**Signature**

```ts
export declare const size: <A>(self: TQueue<A>) => STM.STM<never, never, number>
```

Added in v2.0.0

# models

## BaseTQueue (interface)

The base interface that all `TQueue`s must implement.

**Signature**

```ts
export interface BaseTQueue {
  /**
   * Returns the number of elements the queue can hold.
   */
  capacity(): number

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  readonly size: STM.STM<never, never, number>

  /**
   * Returns `true` if the `TQueue` contains at least one element, `false`
   * otherwise.
   */
  readonly isFull: STM.STM<never, never, boolean>

  /**
   * Returns `true` if the `TQueue` contains zero elements, `false` otherwise.
   */
  readonly isEmpty: STM.STM<never, never, boolean>

  /**
   * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
   * to `offer*` and `take*` will be interrupted immediately.
   */
  readonly shutdown: STM.STM<never, never, void>

  /**
   * Returns `true` if `shutdown` has been called, otherwise returns `false`.
   */
  readonly isShutdown: STM.STM<never, never, boolean>

  /**
   * Waits until the queue is shutdown. The `STM` returned by this method will
   * not resume until the queue has been shutdown. If the queue is already
   * shutdown, the `STM` will resume right away.
   */
  readonly awaitShutdown: STM.STM<never, never, void>
}
```

Added in v2.0.0

## TDequeue (interface)

**Signature**

```ts
export interface TDequeue<out A> extends TQueue.TDequeueVariance<A>, BaseTQueue {
  /**
   * Views the next element in the queue without removing it, retrying if the
   * queue is empty.
   */
  readonly peek: STM.STM<never, never, A>

  /**
   * Views the next element in the queue without removing it, returning `None`
   * if the queue is empty.
   */
  readonly peekOption: STM.STM<never, never, Option.Option<A>>

  /**
   * Takes the oldest value in the queue. If the queue is empty, this will return
   * a computation that resumes when an item has been added to the queue.
   */
  readonly take: STM.STM<never, never, A>

  /**
   * Takes all the values in the queue and returns the values. If the queue is
   * empty returns an empty collection.
   */
  readonly takeAll: STM.STM<never, never, Array<A>>

  /**
   * Takes up to max number of values from the queue.
   */
  takeUpTo(max: number): STM.STM<never, never, Array<A>>
}
```

Added in v2.0.0

## TEnqueue (interface)

**Signature**

```ts
export interface TEnqueue<in A> extends TQueue.TEnqueueVariance<A>, BaseTQueue {
  /**
   * Places one value in the queue.
   */
  offer(value: A): STM.STM<never, never, boolean>

  /**
   * For Bounded TQueue: uses the `BackPressure` Strategy, places the values in
   * the queue and always returns true. If the queue has reached capacity, then
   * the fiber performing the `offerAll` will be suspended until there is room
   * in the queue.
   *
   * For Unbounded TQueue: Places all values in the queue and returns true.
   *
   * For Sliding TQueue: uses `Sliding` Strategy If there is room in the queue,
   * it places the values otherwise it removes the old elements and enqueues the
   * new ones. Always returns true.
   *
   * For Dropping TQueue: uses `Dropping` Strategy, It places the values in the
   * queue but if there is no room it will not enqueue them and return false.
   */
  offerAll(iterable: Iterable<A>): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## TQueue (interface)

**Signature**

```ts
export interface TQueue<in out A> extends TEnqueue<A>, TDequeue<A> {}
```

Added in v2.0.0

# mutations

## awaitShutdown

Waits until the queue is shutdown. The `STM` returned by this method will
not resume until the queue has been shutdown. If the queue is already
shutdown, the `STM` will resume right away.

**Signature**

```ts
export declare const awaitShutdown: <A>(self: TQueue<A>) => STM.STM<never, never, void>
```

Added in v2.0.0

## offer

Places one value in the queue.

**Signature**

```ts
export declare const offer: {
  <A>(value: A): (self: TEnqueue<A>) => STM.STM<never, never, void>
  <A>(self: TEnqueue<A>, value: A): STM.STM<never, never, void>
}
```

Added in v2.0.0

## offerAll

For Bounded TQueue: uses the `BackPressure` Strategy, places the values in
the queue and always returns true. If the queue has reached capacity, then
the fiber performing the `offerAll` will be suspended until there is room
in the queue.

For Unbounded TQueue: Places all values in the queue and returns true.

For Sliding TQueue: uses `Sliding` Strategy If there is room in the queue,
it places the values otherwise it removes the old elements and enqueues the
new ones. Always returns true.

For Dropping TQueue: uses `Dropping` Strategy, It places the values in the
queue but if there is no room it will not enqueue them and return false.

**Signature**

```ts
export declare const offerAll: {
  <A>(iterable: Iterable<A>): (self: TEnqueue<A>) => STM.STM<never, never, boolean>
  <A>(self: TEnqueue<A>, iterable: Iterable<A>): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## seek

Drops elements from the queue while they do not satisfy the predicate,
taking and returning the first element that does satisfy the predicate.
Retries if no elements satisfy the predicate.

**Signature**

```ts
export declare const seek: {
  <A>(predicate: Predicate<A>): (self: TDequeue<A>) => STM.STM<never, never, A>
  <A>(self: TDequeue<A>, predicate: Predicate<A>): STM.STM<never, never, A>
}
```

Added in v2.0.0

## shutdown

Interrupts any fibers that are suspended on `offer` or `take`. Future calls
to `offer*` and `take*` will be interrupted immediately.

**Signature**

```ts
export declare const shutdown: <A>(self: TQueue<A>) => STM.STM<never, never, void>
```

Added in v2.0.0

## take

Takes the oldest value in the queue. If the queue is empty, this will return
a computation that resumes when an item has been added to the queue.

**Signature**

```ts
export declare const take: <A>(self: TDequeue<A>) => STM.STM<never, never, A>
```

Added in v2.0.0

## takeAll

Takes all the values in the queue and returns the values. If the queue is
empty returns an empty collection.

**Signature**

```ts
export declare const takeAll: <A>(self: TDequeue<A>) => STM.STM<never, never, A[]>
```

Added in v2.0.0

## takeBetween

Takes a number of elements from the queue between the specified minimum and
maximum. If there are fewer than the minimum number of elements available,
retries until at least the minimum number of elements have been collected.

**Signature**

```ts
export declare const takeBetween: {
  (min: number, max: number): <A>(self: TDequeue<A>) => STM.STM<never, never, A[]>
  <A>(self: TDequeue<A>, min: number, max: number): STM.STM<never, never, A[]>
}
```

Added in v2.0.0

## takeN

Takes the specified number of elements from the queue. If there are fewer
than the specified number of elements available, it retries until they
become available.

**Signature**

```ts
export declare const takeN: {
  (n: number): <A>(self: TDequeue<A>) => STM.STM<never, never, A[]>
  <A>(self: TDequeue<A>, n: number): STM.STM<never, never, A[]>
}
```

Added in v2.0.0

## takeUpTo

Takes up to max number of values from the queue.

**Signature**

```ts
export declare const takeUpTo: {
  (max: number): <A>(self: TDequeue<A>) => STM.STM<never, never, A[]>
  <A>(self: TDequeue<A>, max: number): STM.STM<never, never, A[]>
}
```

Added in v2.0.0

# refinements

## isTDequeue

Returns `true` if the specified value is a `TDequeue`, `false` otherwise.

**Signature**

```ts
export declare const isTDequeue: (u: unknown) => u is TDequeue<unknown>
```

Added in v2.0.0

## isTEnqueue

Returns `true` if the specified value is a `TEnqueue`, `false` otherwise.

**Signature**

```ts
export declare const isTEnqueue: (u: unknown) => u is TEnqueue<unknown>
```

Added in v2.0.0

## isTQueue

Returns `true` if the specified value is a `TQueue`, `false` otherwise.

**Signature**

```ts
export declare const isTQueue: (u: unknown) => u is TQueue<unknown>
```

Added in v2.0.0

# symbols

## TDequeueTypeId

**Signature**

```ts
export declare const TDequeueTypeId: typeof TDequeueTypeId
```

Added in v2.0.0

## TDequeueTypeId (type alias)

**Signature**

```ts
export type TDequeueTypeId = typeof TDequeueTypeId
```

Added in v2.0.0

## TEnqueueTypeId

**Signature**

```ts
export declare const TEnqueueTypeId: typeof TEnqueueTypeId
```

Added in v2.0.0

## TEnqueueTypeId (type alias)

**Signature**

```ts
export type TEnqueueTypeId = typeof TEnqueueTypeId
```

Added in v2.0.0

# utils

## TQueue (namespace)

Added in v2.0.0

### TDequeueVariance (interface)

**Signature**

```ts
export interface TDequeueVariance<out A> {
  readonly [TDequeueTypeId]: {
    readonly _Out: (_: never) => A
  }
}
```

Added in v2.0.0

### TEnqueueVariance (interface)

**Signature**

```ts
export interface TEnqueueVariance<in A> {
  readonly [TEnqueueTypeId]: {
    readonly _In: (_: A) => void
  }
}
```

Added in v2.0.0
