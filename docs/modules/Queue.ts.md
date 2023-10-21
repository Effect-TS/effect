---
title: Queue.ts
nav_order: 83
parent: Modules
---

## Queue overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [bounded](#bounded)
  - [dropping](#dropping)
  - [make](#make)
  - [sliding](#sliding)
  - [unbounded](#unbounded)
- [getters](#getters)
  - [capacity](#capacity)
  - [isEmpty](#isempty)
  - [isFull](#isfull)
  - [isShutdown](#isshutdown)
  - [size](#size)
- [models](#models)
  - [BackingQueue (interface)](#backingqueue-interface)
  - [BaseQueue (interface)](#basequeue-interface)
  - [Dequeue (interface)](#dequeue-interface)
  - [Enqueue (interface)](#enqueue-interface)
  - [Queue (interface)](#queue-interface)
  - [Strategy (interface)](#strategy-interface)
- [refinements](#refinements)
  - [isDequeue](#isdequeue)
  - [isEnqueue](#isenqueue)
  - [isQueue](#isqueue)
- [strategies](#strategies)
  - [backPressureStrategy](#backpressurestrategy)
  - [droppingStrategy](#droppingstrategy)
  - [slidingStrategy](#slidingstrategy)
- [symbols](#symbols)
  - [DequeueTypeId](#dequeuetypeid)
  - [DequeueTypeId (type alias)](#dequeuetypeid-type-alias)
  - [EnqueueTypeId](#enqueuetypeid)
  - [EnqueueTypeId (type alias)](#enqueuetypeid-type-alias)
  - [QueueStrategyTypeId](#queuestrategytypeid)
  - [QueueStrategyTypeId (type alias)](#queuestrategytypeid-type-alias)
- [utils](#utils)
  - [Queue (namespace)](#queue-namespace)
    - [DequeueVariance (interface)](#dequeuevariance-interface)
    - [EnqueueVariance (interface)](#enqueuevariance-interface)
    - [StrategyVariance (interface)](#strategyvariance-interface)
  - [awaitShutdown](#awaitshutdown)
  - [offer](#offer)
  - [offerAll](#offerall)
  - [poll](#poll)
  - [shutdown](#shutdown)
  - [take](#take)
  - [takeAll](#takeall)
  - [takeBetween](#takebetween)
  - [takeN](#taken)
  - [takeUpTo](#takeupto)
  - [unsafeOffer](#unsafeoffer)

---

# constructors

## bounded

Makes a new bounded `Queue`. When the capacity of the queue is reached, any
additional calls to `offer` will be suspended until there is more room in
the queue.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

**Signature**

```ts
export declare const bounded: <A>(requestedCapacity: number) => Effect.Effect<never, never, Queue<A>>
```

Added in v2.0.0

## dropping

Makes a new bounded `Queue` with the dropping strategy.

When the capacity of the queue is reached, new elements will be dropped and the
old elements will remain.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

**Signature**

```ts
export declare const dropping: <A>(requestedCapacity: number) => Effect.Effect<never, never, Queue<A>>
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: <A>(queue: BackingQueue<A>, strategy: Strategy<A>) => Effect.Effect<never, never, Queue<A>>
```

Added in v2.0.0

## sliding

Makes a new bounded `Queue` with the sliding strategy.

When the capacity of the queue is reached, new elements will be added and the
old elements will be dropped.

**Note**: When possible use only power of 2 capacities; this will provide
better performance by utilising an optimised version of the underlying
`RingBuffer`.

**Signature**

```ts
export declare const sliding: <A>(requestedCapacity: number) => Effect.Effect<never, never, Queue<A>>
```

Added in v2.0.0

## unbounded

Creates a new unbounded `Queue`.

**Signature**

```ts
export declare const unbounded: <A>() => Effect.Effect<never, never, Queue<A>>
```

Added in v2.0.0

# getters

## capacity

Returns the number of elements the queue can hold.

**Signature**

```ts
export declare const capacity: <A>(self: Dequeue<A> | Enqueue<A>) => number
```

Added in v2.0.0

## isEmpty

Returns `true` if the `Queue` contains zero elements, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, boolean>
```

Added in v2.0.0

## isFull

Returns `true` if the `Queue` contains at least one element, `false`
otherwise.

**Signature**

```ts
export declare const isFull: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, boolean>
```

Added in v2.0.0

## isShutdown

Returns `true` if `shutdown` has been called, otherwise returns `false`.

**Signature**

```ts
export declare const isShutdown: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, boolean>
```

Added in v2.0.0

## size

Retrieves the size of the queue, which is equal to the number of elements
in the queue. This may be negative if fibers are suspended waiting for
elements to be added to the queue.

**Signature**

```ts
export declare const size: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, number>
```

Added in v2.0.0

# models

## BackingQueue (interface)

**Signature**

```ts
export interface BackingQueue<A> {
  /**
   * Dequeues an element from the queue.
   * Returns either an element from the queue, or the `def` param.
   */
  poll<Def>(def: Def): A | Def
  /**
   * Dequeues up to `limit` elements from the queue.
   */
  pollUpTo(limit: number): Chunk.Chunk<A>
  /**
   * Enqueues a collection of values into the queue.
   *
   * Returns a `Chunk` of the values that were **not** able to be enqueued.
   */
  offerAll(elements: Iterable<A>): Chunk.Chunk<A>
  /**
   * Offers an element to the queue.
   *
   * Returns whether the enqueue was successful or not.
   */
  offer(element: A): boolean
  /**
   * The **maximum** number of elements that a queue can hold.
   *
   * **Note**: unbounded queues can still implement this interface with
   * `capacity = Infinity`.
   */
  capacity(): number
  /**
   * Returns the number of elements currently in the queue
   */
  length(): number
}
```

Added in v2.0.0

## BaseQueue (interface)

The base interface that all `Queue`s must implement.

**Signature**

```ts
export interface BaseQueue {
  /**
   * Returns the number of elements the queue can hold.
   */
  capacity(): number

  /**
   * Returns false if shutdown has been called.
   */
  isActive(): boolean

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue.
   */
  size(): Effect.Effect<never, never, number>

  /**
   * Retrieves the size of the queue, which is equal to the number of elements
   * in the queue. This may be negative if fibers are suspended waiting for
   * elements to be added to the queue. Returns None if shutdown has been called
   */
  unsafeSize(): Option.Option<number>

  /**
   * Returns `true` if the `Queue` contains at least one element, `false`
   * otherwise.
   */
  isFull(): Effect.Effect<never, never, boolean>

  /**
   * Returns `true` if the `Queue` contains zero elements, `false` otherwise.
   */
  isEmpty(): Effect.Effect<never, never, boolean>

  /**
   * Interrupts any fibers that are suspended on `offer` or `take`. Future calls
   * to `offer*` and `take*` will be interrupted immediately.
   */
  shutdown(): Effect.Effect<never, never, void>

  /**
   * Returns `true` if `shutdown` has been called, otherwise returns `false`.
   */
  isShutdown(): Effect.Effect<never, never, boolean>

  /**
   * Waits until the queue is shutdown. The `Effect` returned by this method will
   * not resume until the queue has been shutdown. If the queue is already
   * shutdown, the `Effect` will resume right away.
   */
  awaitShutdown(): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## Dequeue (interface)

**Signature**

```ts
export interface Dequeue<A> extends Queue.DequeueVariance<A>, BaseQueue, Pipeable {
  /**
   * Takes the oldest value in the queue. If the queue is empty, this will return
   * a computation that resumes when an item has been added to the queue.
   */
  take(): Effect.Effect<never, never, A>

  /**
   * Takes all the values in the queue and returns the values. If the queue is
   * empty returns an empty collection.
   */
  takeAll(): Effect.Effect<never, never, Chunk.Chunk<A>>

  /**
   * Takes up to max number of values from the queue.
   */
  takeUpTo(max: number): Effect.Effect<never, never, Chunk.Chunk<A>>

  /**
   * Takes a number of elements from the queue between the specified minimum and
   * maximum. If there are fewer than the minimum number of elements available,
   * suspends until at least the minimum number of elements have been collected.
   */
  takeBetween(min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## Enqueue (interface)

**Signature**

```ts
export interface Enqueue<A> extends Queue.EnqueueVariance<A>, BaseQueue, Pipeable {
  /**
   * Places one value in the queue.
   */
  offer(value: A): Effect.Effect<never, never, boolean>

  /**
   * Places one value in the queue when possible without needing the fiber runtime.
   */
  unsafeOffer(value: A): boolean

  /**
   * For Bounded Queue: uses the `BackPressure` Strategy, places the values in
   * the queue and always returns true. If the queue has reached capacity, then
   * the fiber performing the `offerAll` will be suspended until there is room
   * in the queue.
   *
   * For Unbounded Queue: Places all values in the queue and returns true.
   *
   * For Sliding Queue: uses `Sliding` Strategy If there is room in the queue,
   * it places the values otherwise it removes the old elements and enqueues the
   * new ones. Always returns true.
   *
   * For Dropping Queue: uses `Dropping` Strategy, It places the values in the
   * queue but if there is no room it will not enqueue them and return false.
   */
  offerAll(iterable: Iterable<A>): Effect.Effect<never, never, boolean>
}
```

Added in v2.0.0

## Queue (interface)

**Signature**

```ts
export interface Queue<A> extends Enqueue<A>, Dequeue<A>, Pipeable {
  /** @internal */
  readonly queue: BackingQueue<A>
  /** @internal */
  readonly takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>
  /** @internal */
  readonly shutdownHook: Deferred.Deferred<never, void>
  /** @internal */
  readonly shutdownFlag: MutableRef.MutableRef<boolean>
  /** @internal */
  readonly strategy: Strategy<A>
}
```

Added in v2.0.0

## Strategy (interface)

**Signature**

```ts
export interface Strategy<A> extends Queue.StrategyVariance<A> {
  /**
   * Returns the number of surplus values that were unable to be added to the
   * `Queue`
   */
  surplusSize(): number

  /**
   * Determines how the `Queue.Strategy` should shut down when the `Queue` is
   * shut down.
   */
  shutdown(): Effect.Effect<never, never, void>

  /**
   * Determines the behavior of the `Queue.Strategy` when there are surplus
   * values that could not be added to the `Queue` following an `offer`
   * operation.
   */
  handleSurplus(
    iterable: Iterable<A>,
    queue: BackingQueue<A>,
    takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>,
    isShutdown: MutableRef.MutableRef<boolean>
  ): Effect.Effect<never, never, boolean>

  /**
   * It is called when the backing queue is empty but there are some
   * takers that can be completed
   */
  onCompleteTakersWithEmptyQueue(takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>): void

  /**
   * Determines the behavior of the `Queue.Strategy` when the `Queue` has empty
   * slots following a `take` operation.
   */
  unsafeOnQueueEmptySpace(queue: BackingQueue<A>, takers: MutableQueue.MutableQueue<Deferred.Deferred<never, A>>): void
}
```

Added in v2.0.0

# refinements

## isDequeue

Returns `true` if the specified value is a `Dequeue`, `false` otherwise.

**Signature**

```ts
export declare const isDequeue: (u: unknown) => u is Dequeue<unknown>
```

Added in v2.0.0

## isEnqueue

Returns `true` if the specified value is a `Enqueue`, `false` otherwise.

**Signature**

```ts
export declare const isEnqueue: (u: unknown) => u is Enqueue<unknown>
```

Added in v2.0.0

## isQueue

Returns `true` if the specified value is a `Queue`, `false` otherwise.

**Signature**

```ts
export declare const isQueue: (u: unknown) => u is Queue<unknown>
```

Added in v2.0.0

# strategies

## backPressureStrategy

**Signature**

```ts
export declare const backPressureStrategy: <A>() => Strategy<A>
```

Added in v2.0.0

## droppingStrategy

**Signature**

```ts
export declare const droppingStrategy: <A>() => Strategy<A>
```

Added in v2.0.0

## slidingStrategy

**Signature**

```ts
export declare const slidingStrategy: <A>() => Strategy<A>
```

Added in v2.0.0

# symbols

## DequeueTypeId

**Signature**

```ts
export declare const DequeueTypeId: typeof DequeueTypeId
```

Added in v2.0.0

## DequeueTypeId (type alias)

**Signature**

```ts
export type DequeueTypeId = typeof DequeueTypeId
```

Added in v2.0.0

## EnqueueTypeId

**Signature**

```ts
export declare const EnqueueTypeId: typeof EnqueueTypeId
```

Added in v2.0.0

## EnqueueTypeId (type alias)

**Signature**

```ts
export type EnqueueTypeId = typeof EnqueueTypeId
```

Added in v2.0.0

## QueueStrategyTypeId

**Signature**

```ts
export declare const QueueStrategyTypeId: typeof QueueStrategyTypeId
```

Added in v2.0.0

## QueueStrategyTypeId (type alias)

**Signature**

```ts
export type QueueStrategyTypeId = typeof QueueStrategyTypeId
```

Added in v2.0.0

# utils

## Queue (namespace)

Added in v2.0.0

### DequeueVariance (interface)

**Signature**

```ts
export interface DequeueVariance<A> {
  readonly [DequeueTypeId]: {
    readonly _Out: (_: never) => A
  }
}
```

Added in v2.0.0

### EnqueueVariance (interface)

**Signature**

```ts
export interface EnqueueVariance<A> {
  readonly [EnqueueTypeId]: {
    readonly _In: (_: A) => void
  }
}
```

Added in v2.0.0

### StrategyVariance (interface)

**Signature**

```ts
export interface StrategyVariance<A> {
  readonly [QueueStrategyTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0

## awaitShutdown

Waits until the queue is shutdown. The `Effect` returned by this method will
not resume until the queue has been shutdown. If the queue is already
shutdown, the `Effect` will resume right away.

**Signature**

```ts
export declare const awaitShutdown: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, void>
```

Added in v2.0.0

## offer

Places one value in the queue.

**Signature**

```ts
export declare const offer: {
  <A>(value: A): (self: Enqueue<A>) => Effect.Effect<never, never, boolean>
  <A>(self: Enqueue<A>, value: A): Effect.Effect<never, never, boolean>
}
```

Added in v2.0.0

## offerAll

For Bounded Queue: uses the `BackPressure` Strategy, places the values in
the queue and always returns true. If the queue has reached capacity, then
the fiber performing the `offerAll` will be suspended until there is room
in the queue.

For Unbounded Queue: Places all values in the queue and returns true.

For Sliding Queue: uses `Sliding` Strategy If there is room in the queue,
it places the values otherwise it removes the old elements and enqueues the
new ones. Always returns true.

For Dropping Queue: uses `Dropping` Strategy, It places the values in the
queue but if there is no room it will not enqueue them and return false.

**Signature**

```ts
export declare const offerAll: {
  <A>(iterable: Iterable<A>): (self: Enqueue<A>) => Effect.Effect<never, never, boolean>
  <A>(self: Enqueue<A>, iterable: Iterable<A>): Effect.Effect<never, never, boolean>
}
```

Added in v2.0.0

## poll

Returns the first value in the `Queue` as a `Some<A>`, or `None` if the queue
is empty.

**Signature**

```ts
export declare const poll: <A>(self: Dequeue<A>) => Effect.Effect<never, never, Option.Option<A>>
```

Added in v2.0.0

## shutdown

Interrupts any fibers that are suspended on `offer` or `take`. Future calls
to `offer*` and `take*` will be interrupted immediately.

**Signature**

```ts
export declare const shutdown: <A>(self: Dequeue<A> | Enqueue<A>) => Effect.Effect<never, never, void>
```

Added in v2.0.0

## take

Takes the oldest value in the queue. If the queue is empty, this will return
a computation that resumes when an item has been added to the queue.

**Signature**

```ts
export declare const take: <A>(self: Dequeue<A>) => Effect.Effect<never, never, A>
```

Added in v2.0.0

## takeAll

Takes all the values in the queue and returns the values. If the queue is
empty returns an empty collection.

**Signature**

```ts
export declare const takeAll: <A>(self: Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
```

Added in v2.0.0

## takeBetween

Takes a number of elements from the queue between the specified minimum and
maximum. If there are fewer than the minimum number of elements available,
suspends until at least the minimum number of elements have been collected.

**Signature**

```ts
export declare const takeBetween: {
  (min: number, max: number): <A>(self: Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
  <A>(self: Dequeue<A>, min: number, max: number): Effect.Effect<never, never, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## takeN

Takes the specified number of elements from the queue. If there are fewer
than the specified number of elements available, it suspends until they
become available.

**Signature**

```ts
export declare const takeN: {
  (n: number): <A>(self: Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
  <A>(self: Dequeue<A>, n: number): Effect.Effect<never, never, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## takeUpTo

Takes up to max number of values from the queue.

**Signature**

```ts
export declare const takeUpTo: {
  (max: number): <A>(self: Dequeue<A>) => Effect.Effect<never, never, Chunk.Chunk<A>>
  <A>(self: Dequeue<A>, max: number): Effect.Effect<never, never, Chunk.Chunk<A>>
}
```

Added in v2.0.0

## unsafeOffer

Places one value in the queue.

**Signature**

```ts
export declare const unsafeOffer: {
  <A>(value: A): (self: Enqueue<A>) => boolean
  <A>(self: Enqueue<A>, value: A): boolean
}
```

Added in v2.0.0
