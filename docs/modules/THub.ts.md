---
title: THub.ts
nav_order: 129
parent: Modules
---

## THub overview

Added in v1.0.0

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
  - [THub (interface)](#thub-interface)
- [mutations](#mutations)
  - [awaitShutdown](#awaitshutdown)
  - [publish](#publish)
  - [publishAll](#publishall)
  - [subscribe](#subscribe)
  - [subscribeScoped](#subscribescoped)
- [symbols](#symbols)
  - [THubTypeId](#thubtypeid)
  - [THubTypeId (type alias)](#thubtypeid-type-alias)

---

# constructors

## bounded

Creates a bounded hub with the back pressure strategy. The hub will retain
messages until they have been taken by all subscribers, applying back
pressure to publishers if the hub is at capacity.

**Signature**

```ts
export declare const bounded: <A>(requestedCapacity: number) => STM.STM<never, never, THub<A>>
```

Added in v1.0.0

## dropping

Creates a bounded hub with the dropping strategy. The hub will drop new
messages if the hub is at capacity.

**Signature**

```ts
export declare const dropping: <A>(requestedCapacity: number) => STM.STM<never, never, THub<A>>
```

Added in v1.0.0

## sliding

Creates a bounded hub with the sliding strategy. The hub will add new
messages and drop old messages if the hub is at capacity.

For best performance use capacities that are powers of two.

**Signature**

```ts
export declare const sliding: <A>(requestedCapacity: number) => STM.STM<never, never, THub<A>>
```

Added in v1.0.0

## unbounded

Creates an unbounded hub.

**Signature**

```ts
export declare const unbounded: <A>() => STM.STM<never, never, THub<A>>
```

Added in v1.0.0

# getters

## capacity

Returns the number of elements the hub can hold.

**Signature**

```ts
export declare const capacity: <A>(self: THub<A>) => number
```

Added in v1.0.0

## isEmpty

Returns `true` if the `THub` contains zero elements, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: <A>(self: THub<A>) => STM.STM<never, never, boolean>
```

Added in v1.0.0

## isFull

Returns `true` if the `THub` contains at least one element, `false`
otherwise.

**Signature**

```ts
export declare const isFull: <A>(self: THub<A>) => STM.STM<never, never, boolean>
```

Added in v1.0.0

## isShutdown

Returns `true` if `shutdown` has been called, otherwise returns `false`.

**Signature**

```ts
export declare const isShutdown: <A>(self: THub<A>) => STM.STM<never, never, boolean>
```

Added in v1.0.0

## size

Retrieves the size of the hub, which is equal to the number of elements
in the hub. This may be negative if fibers are suspended waiting for
elements to be added to the hub.

**Signature**

```ts
export declare const size: <A>(self: THub<A>) => STM.STM<never, never, number>
```

Added in v1.0.0

# models

## THub (interface)

**Signature**

```ts
export interface THub<A> extends TQueue.TEnqueue<A> {}
```

Added in v1.0.0

# mutations

## awaitShutdown

Waits until the hub is shutdown. The `STM` returned by this method will
not resume until the queue has been shutdown. If the hub is already
shutdown, the `STM` will resume right away.

**Signature**

```ts
export declare const awaitShutdown: <A>(self: THub<A>) => STM.STM<never, never, void>
```

Added in v1.0.0

## publish

Publishes a message to the hub, returning whether the message was published
to the hub.

**Signature**

```ts
export declare const publish: {
  <A>(value: A): (self: THub<A>) => STM.STM<never, never, boolean>
  <A>(self: THub<A>, value: A): STM.STM<never, never, boolean>
}
```

Added in v1.0.0

## publishAll

Publishes all of the specified messages to the hub, returning whether they
were published to the hub.

**Signature**

```ts
export declare const publishAll: {
  <A>(iterable: Iterable<A>): (self: THub<A>) => STM.STM<never, never, boolean>
  <A>(self: THub<A>, iterable: Iterable<A>): STM.STM<never, never, boolean>
}
```

Added in v1.0.0

## subscribe

Subscribes to receive messages from the hub. The resulting subscription can
be evaluated multiple times to take a message from the hub each time. The
caller is responsible for unsubscribing from the hub by shutting down the
queue.

**Signature**

```ts
export declare const subscribe: <A>(self: THub<A>) => STM.STM<never, never, TQueue.TDequeue<A>>
```

Added in v1.0.0

## subscribeScoped

Subscribes to receive messages from the hub. The resulting subscription can
be evaluated multiple times within the scope to take a message from the hub
each time.

**Signature**

```ts
export declare const subscribeScoped: <A>(self: THub<A>) => Effect.Effect<Scope.Scope, never, TQueue.TDequeue<A>>
```

Added in v1.0.0

# symbols

## THubTypeId

**Signature**

```ts
export declare const THubTypeId: typeof THubTypeId
```

Added in v1.0.0

## THubTypeId (type alias)

**Signature**

```ts
export type THubTypeId = typeof THubTypeId
```

Added in v1.0.0
