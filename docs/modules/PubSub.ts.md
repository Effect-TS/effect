---
title: PubSub.ts
nav_order: 79
parent: Modules
---

## PubSub overview

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
  - [size](#size)
- [models](#models)
  - [PubSub (interface)](#pubsub-interface)
- [utils](#utils)
  - [awaitShutdown](#awaitshutdown)
  - [publish](#publish)
  - [publishAll](#publishall)
  - [shutdown](#shutdown)
  - [subscribe](#subscribe)

---

# constructors

## bounded

Creates a bounded `PubSub` with the back pressure strategy. The `PubSub` will retain
messages until they have been taken by all subscribers, applying back
pressure to publishers if the `PubSub` is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const bounded: <A>(requestedCapacity: number) => Effect<never, never, PubSub<A>>
```

Added in v2.0.0

## dropping

Creates a bounded `PubSub` with the dropping strategy. The `PubSub` will drop new
messages if the `PubSub` is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const dropping: <A>(requestedCapacity: number) => Effect<never, never, PubSub<A>>
```

Added in v2.0.0

## sliding

Creates a bounded `PubSub` with the sliding strategy. The `PubSub` will add new
messages and drop old messages if the `PubSub` is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const sliding: <A>(requestedCapacity: number) => Effect<never, never, PubSub<A>>
```

Added in v2.0.0

## unbounded

Creates an unbounded `PubSub`.

**Signature**

```ts
export declare const unbounded: <A>() => Effect<never, never, PubSub<A>>
```

Added in v2.0.0

# getters

## capacity

Returns the number of elements the queue can hold.

**Signature**

```ts
export declare const capacity: <A>(self: PubSub<A>) => number
```

Added in v2.0.0

## isEmpty

Returns `true` if the `Queue` contains zero elements, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: <A>(self: PubSub<A>) => Effect<never, never, boolean>
```

Added in v2.0.0

## isFull

Returns `true` if the `Queue` contains at least one element, `false`
otherwise.

**Signature**

```ts
export declare const isFull: <A>(self: PubSub<A>) => Effect<never, never, boolean>
```

Added in v2.0.0

## isShutdown

Returns `true` if `shutdown` has been called, otherwise returns `false`.

**Signature**

```ts
export declare const isShutdown: <A>(self: PubSub<A>) => Effect<never, never, boolean>
```

Added in v2.0.0

## size

Retrieves the size of the queue, which is equal to the number of elements
in the queue. This may be negative if fibers are suspended waiting for
elements to be added to the queue.

**Signature**

```ts
export declare const size: <A>(self: PubSub<A>) => Effect<never, never, number>
```

Added in v2.0.0

# models

## PubSub (interface)

A `PubSub<A>` is an asynchronous message hub into which publishers can publish
messages of type `A` and subscribers can subscribe to take messages of type
`A`.

**Signature**

```ts
export interface PubSub<A> extends Queue.Enqueue<A>, Pipeable {
  /**
   * Publishes a message to the `PubSub`, returning whether the message was published
   * to the `PubSub`.
   */
  publish(value: A): Effect<never, never, boolean>

  /**
   * Publishes all of the specified messages to the `PubSub`, returning whether they
   * were published to the `PubSub`.
   */
  publishAll(elements: Iterable<A>): Effect<never, never, boolean>

  /**
   * Subscribes to receive messages from the `PubSub`. The resulting subscription can
   * be evaluated multiple times within the scope to take a message from the `PubSub`
   * each time.
   */
  subscribe(): Effect<Scope, never, Queue.Dequeue<A>>
}
```

Added in v2.0.0

# utils

## awaitShutdown

Waits until the queue is shutdown. The `Effect` returned by this method will
not resume until the queue has been shutdown. If the queue is already
shutdown, the `Effect` will resume right away.

**Signature**

```ts
export declare const awaitShutdown: <A>(self: PubSub<A>) => Effect<never, never, void>
```

Added in v2.0.0

## publish

Publishes a message to the `PubSub`, returning whether the message was published
to the `PubSub`.

**Signature**

```ts
export declare const publish: {
  <A>(value: A): (self: PubSub<A>) => Effect<never, never, boolean>
  <A>(self: PubSub<A>, value: A): Effect<never, never, boolean>
}
```

Added in v2.0.0

## publishAll

Publishes all of the specified messages to the `PubSub`, returning whether they
were published to the `PubSub`.

**Signature**

```ts
export declare const publishAll: {
  <A>(elements: Iterable<A>): (self: PubSub<A>) => Effect<never, never, boolean>
  <A>(self: PubSub<A>, elements: Iterable<A>): Effect<never, never, boolean>
}
```

Added in v2.0.0

## shutdown

Interrupts any fibers that are suspended on `offer` or `take`. Future calls
to `offer*` and `take*` will be interrupted immediately.

**Signature**

```ts
export declare const shutdown: <A>(self: PubSub<A>) => Effect<never, never, void>
```

Added in v2.0.0

## subscribe

Subscribes to receive messages from the `PubSub`. The resulting subscription can
be evaluated multiple times within the scope to take a message from the `PubSub`
each time.

**Signature**

```ts
export declare const subscribe: <A>(self: PubSub<A>) => Effect<Scope, never, Queue.Dequeue<A>>
```

Added in v2.0.0
