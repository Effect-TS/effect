---
title: TPubSub.ts
nav_order: 131
parent: Modules
---

## TPubSub overview

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
  - [TPubSub (interface)](#tpubsub-interface)
- [mutations](#mutations)
  - [awaitShutdown](#awaitshutdown)
  - [publish](#publish)
  - [publishAll](#publishall)
  - [subscribe](#subscribe)
  - [subscribeScoped](#subscribescoped)
- [symbols](#symbols)
  - [TPubSubTypeId](#tpubsubtypeid)
  - [TPubSubTypeId (type alias)](#tpubsubtypeid-type-alias)

---

# constructors

## bounded

Creates a bounded `TPubSub` with the back pressure strategy. The `TPubSub` will retain
messages until they have been taken by all subscribers, applying back
pressure to publishers if the `TPubSub` is at capacity.

**Signature**

```ts
export declare const bounded: <A>(requestedCapacity: number) => STM.STM<never, never, TPubSub<A>>
```

Added in v2.0.0

## dropping

Creates a bounded `TPubSub` with the dropping strategy. The `TPubSub` will drop new
messages if the `TPubSub` is at capacity.

**Signature**

```ts
export declare const dropping: <A>(requestedCapacity: number) => STM.STM<never, never, TPubSub<A>>
```

Added in v2.0.0

## sliding

Creates a bounded `TPubSub` with the sliding strategy. The `TPubSub` will add new
messages and drop old messages if the `TPubSub` is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const sliding: <A>(requestedCapacity: number) => STM.STM<never, never, TPubSub<A>>
```

Added in v2.0.0

## unbounded

Creates an unbounded `TPubSub`.

**Signature**

```ts
export declare const unbounded: <A>() => STM.STM<never, never, TPubSub<A>>
```

Added in v2.0.0

# getters

## capacity

Returns the number of elements the `TPubSub` can hold.

**Signature**

```ts
export declare const capacity: <A>(self: TPubSub<A>) => number
```

Added in v2.0.0

## isEmpty

Returns `true` if the `TPubSub` contains zero elements, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: <A>(self: TPubSub<A>) => STM.STM<never, never, boolean>
```

Added in v2.0.0

## isFull

Returns `true` if the `TPubSub` contains at least one element, `false`
otherwise.

**Signature**

```ts
export declare const isFull: <A>(self: TPubSub<A>) => STM.STM<never, never, boolean>
```

Added in v2.0.0

## isShutdown

Returns `true` if `shutdown` has been called, otherwise returns `false`.

**Signature**

```ts
export declare const isShutdown: <A>(self: TPubSub<A>) => STM.STM<never, never, boolean>
```

Added in v2.0.0

## size

Retrieves the size of the `TPubSub`, which is equal to the number of elements
in the `TPubSub`. This may be negative if fibers are suspended waiting for
elements to be added to the `TPubSub`.

**Signature**

```ts
export declare const size: <A>(self: TPubSub<A>) => STM.STM<never, never, number>
```

Added in v2.0.0

# models

## TPubSub (interface)

**Signature**

```ts
export interface TPubSub<in out A> extends TQueue.TEnqueue<A> {
  readonly [TPubSubTypeId]: {
    readonly _A: (_: A) => A
  }
}
```

Added in v2.0.0

# mutations

## awaitShutdown

Waits until the `TPubSub` is shutdown. The `STM` returned by this method will
not resume until the queue has been shutdown. If the `TPubSub` is already
shutdown, the `STM` will resume right away.

**Signature**

```ts
export declare const awaitShutdown: <A>(self: TPubSub<A>) => STM.STM<never, never, void>
```

Added in v2.0.0

## publish

Publishes a message to the `TPubSub`, returning whether the message was published
to the `TPubSub`.

**Signature**

```ts
export declare const publish: {
  <A>(value: A): (self: TPubSub<A>) => STM.STM<never, never, boolean>
  <A>(self: TPubSub<A>, value: A): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## publishAll

Publishes all of the specified messages to the `TPubSub`, returning whether they
were published to the `TPubSub`.

**Signature**

```ts
export declare const publishAll: {
  <A>(iterable: Iterable<A>): (self: TPubSub<A>) => STM.STM<never, never, boolean>
  <A>(self: TPubSub<A>, iterable: Iterable<A>): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## subscribe

Subscribes to receive messages from the `TPubSub`. The resulting subscription can
be evaluated multiple times to take a message from the `TPubSub` each time. The
caller is responsible for unsubscribing from the `TPubSub` by shutting down the
queue.

**Signature**

```ts
export declare const subscribe: <A>(self: TPubSub<A>) => STM.STM<never, never, TQueue.TDequeue<A>>
```

Added in v2.0.0

## subscribeScoped

Subscribes to receive messages from the `TPubSub`. The resulting subscription can
be evaluated multiple times within the scope to take a message from the `TPubSub`
each time.

**Signature**

```ts
export declare const subscribeScoped: <A>(self: TPubSub<A>) => Effect.Effect<Scope.Scope, never, TQueue.TDequeue<A>>
```

Added in v2.0.0

# symbols

## TPubSubTypeId

**Signature**

```ts
export declare const TPubSubTypeId: typeof TPubSubTypeId
```

Added in v2.0.0

## TPubSubTypeId (type alias)

**Signature**

```ts
export type TPubSubTypeId = typeof TPubSubTypeId
```

Added in v2.0.0
