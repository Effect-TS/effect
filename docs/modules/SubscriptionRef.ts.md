---
title: SubscriptionRef.ts
nav_order: 113
parent: Modules
---

## SubscriptionRef overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [SubscriptionRef (interface)](#subscriptionref-interface)
- [symbols](#symbols)
  - [SubscriptionRefTypeId](#subscriptionreftypeid)
  - [SubscriptionRefTypeId (type alias)](#subscriptionreftypeid-type-alias)
- [utils](#utils)
  - [SubscriptionRef (namespace)](#subscriptionref-namespace)
    - [Variance (interface)](#variance-interface)
  - [getAndSet](#getandset)
  - [getAndUpdate](#getandupdate)
  - [getAndUpdateEffect](#getandupdateeffect)
  - [getAndUpdateSome](#getandupdatesome)
  - [getAndUpdateSomeEffect](#getandupdatesomeeffect)
  - [modify](#modify)
  - [modifyEffect](#modifyeffect)
  - [modifySome](#modifysome)
  - [modifySomeEffect](#modifysomeeffect)
  - [set](#set)
  - [setAndGet](#setandget)
  - [update](#update)
  - [updateAndGet](#updateandget)
  - [updateAndGetEffect](#updateandgeteffect)
  - [updateEffect](#updateeffect)
  - [updateSome](#updatesome)
  - [updateSomeAndGet](#updatesomeandget)
  - [updateSomeAndGetEffect](#updatesomeandgeteffect)
  - [updateSomeEffect](#updatesomeeffect)

---

# constructors

## make

Creates a new `SubscriptionRef` with the specified value.

**Signature**

```ts
export declare const make: <A>(value: A) => Effect.Effect<never, never, SubscriptionRef<A>>
```

Added in v2.0.0

# getters

## get

**Signature**

```ts
export declare const get: <A>(self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
```

Added in v2.0.0

# models

## SubscriptionRef (interface)

A `SubscriptionRef<A>` is a `Ref` that can be subscribed to in order to
receive the current value as well as all changes to the value.

**Signature**

```ts
export interface SubscriptionRef<A> extends SubscriptionRef.Variance<A>, Synchronized.SynchronizedRef<A>, Pipeable {
  /** @internal */
  readonly ref: Ref.Ref<A>
  /** @internal */
  readonly pubsub: PubSub.PubSub<A>
  /** @internal */
  readonly semaphore: Effect.Semaphore
  /**
   * A stream containing the current value of the `Ref` as well as all changes
   * to that value.
   */
  readonly changes: Stream.Stream<never, never, A>
}
```

Added in v2.0.0

# symbols

## SubscriptionRefTypeId

**Signature**

```ts
export declare const SubscriptionRefTypeId: typeof SubscriptionRefTypeId
```

Added in v2.0.0

## SubscriptionRefTypeId (type alias)

**Signature**

```ts
export type SubscriptionRefTypeId = typeof SubscriptionRefTypeId
```

Added in v2.0.0

# utils

## SubscriptionRef (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [SubscriptionRefTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0

## getAndSet

**Signature**

```ts
export declare const getAndSet: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## getAndUpdateEffect

**Signature**

```ts
export declare const getAndUpdateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}
```

Added in v2.0.0

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## getAndUpdateSomeEffect

**Signature**

```ts
export declare const getAndUpdateSomeEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A>
}
```

Added in v2.0.0

## modify

**Signature**

```ts
export declare const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: SubscriptionRef<A>) => Effect.Effect<never, never, B>
  <A, B>(self: SubscriptionRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
}
```

Added in v2.0.0

## modifyEffect

**Signature**

```ts
export declare const modifyEffect: {
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, B>
  <A, R, E, B>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B>
}
```

Added in v2.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: {
  <B, A>(
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): (self: SubscriptionRef<A>) => Effect.Effect<never, never, B>
  <A, B>(
    self: SubscriptionRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<readonly [B, A]>
  ): Effect.Effect<never, never, B>
}
```

Added in v2.0.0

## modifySomeEffect

**Signature**

```ts
export declare const modifySomeEffect: {
  <A, B, R, E>(
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ): (self: SubscriptionRef<A>) => Effect.Effect<R, E, B>
  <A, B, R, E>(
    self: SubscriptionRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ): Effect.Effect<R, E, B>
}
```

Added in v2.0.0

## set

**Signature**

```ts
export declare const set: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## setAndGet

**Signature**

```ts
export declare const setAndGet: {
  <A>(value: A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, value: A): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## update

**Signature**

```ts
export declare const update: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## updateAndGet

**Signature**

```ts
export declare const updateAndGet: {
  <A>(f: (a: A) => A): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## updateAndGetEffect

**Signature**

```ts
export declare const updateAndGetEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}
```

Added in v2.0.0

## updateEffect

**Signature**

```ts
export declare const updateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, void>
  <A, R, E>(self: SubscriptionRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, void>
}
```

Added in v2.0.0

## updateSome

**Signature**

```ts
export declare const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<never, never, void>
  <A>(self: SubscriptionRef<A>, f: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## updateSomeAndGet

**Signature**

```ts
export declare const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: SubscriptionRef<A>) => Effect.Effect<never, never, A>
  <A>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## updateSomeAndGetEffect

**Signature**

```ts
export declare const updateSomeAndGetEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): (self: SubscriptionRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A>
}
```

Added in v2.0.0

## updateSomeEffect

**Signature**

```ts
export declare const updateSomeEffect: {
  <A, R, E>(
    pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>
  ): (self: SubscriptionRef<A>) => Effect.Effect<R, E, void>
  <A, R, E>(self: SubscriptionRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, void>
}
```

Added in v2.0.0
