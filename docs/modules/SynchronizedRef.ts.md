---
title: SynchronizedRef.ts
nav_order: 99
parent: Modules
---

## SynchronizedRef overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [SynchronizedRef (interface)](#synchronizedref-interface)
- [symbols](#symbols)
  - [SynchronizedRefTypeId](#synchronizedreftypeid)
  - [SynchronizedRefTypeId (type alias)](#synchronizedreftypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeMake](#unsafemake)
- [utils](#utils)
  - [SynchronizedRef (namespace)](#synchronizedref-namespace)
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

**Signature**

```ts
export declare const make: <A>(value: A) => Effect.Effect<never, never, SynchronizedRef<A>>
```

Added in v1.0.0

# getters

## get

**Signature**

```ts
export declare const get: <A>(self: SynchronizedRef<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

# models

## SynchronizedRef (interface)

**Signature**

```ts
export interface SynchronizedRef<A> extends SynchronizedRef.Variance<A>, Ref.Ref<A> {
  modifyEffect<R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B>
}
```

Added in v1.0.0

# symbols

## SynchronizedRefTypeId

**Signature**

```ts
export declare const SynchronizedRefTypeId: typeof SynchronizedRefTypeId
```

Added in v1.0.0

## SynchronizedRefTypeId (type alias)

**Signature**

```ts
export type SynchronizedRefTypeId = typeof SynchronizedRefTypeId
```

Added in v1.0.0

# unsafe

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: <A>(value: A) => SynchronizedRef<A>
```

Added in v1.0.0

# utils

## SynchronizedRef (namespace)

Added in v1.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [SynchronizedRefTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v1.0.0

## getAndSet

**Signature**

```ts
export declare const getAndSet: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## getAndUpdateEffect

**Signature**

```ts
export declare const getAndUpdateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## getAndUpdateSomeEffect

**Signature**

```ts
export declare const getAndUpdateSomeEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## modify

**Signature**

```ts
export declare const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: SynchronizedRef<A>) => Effect.Effect<never, never, B>
  <A, B>(self: SynchronizedRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
}
```

Added in v1.0.0

## modifyEffect

**Signature**

```ts
export declare const modifyEffect: {
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, B>
  <A, R, E, B>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, readonly [B, A]>): Effect.Effect<R, E, B>
}
```

Added in v1.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: {
  <B, A>(fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>): (
    self: Ref.Ref<A>
  ) => Effect.Effect<never, never, B>
  <A, B>(self: Ref.Ref<A>, fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>): Effect.Effect<never, never, B>
}
```

Added in v1.0.0

## modifySomeEffect

**Signature**

```ts
export declare const modifySomeEffect: {
  <A, B, R, E>(fallback: B, pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>): (
    self: SynchronizedRef<A>
  ) => Effect.Effect<R, E, B>
  <A, B, R, E>(
    self: SynchronizedRef<A>,
    fallback: B,
    pf: (a: A) => Option.Option<Effect.Effect<R, E, readonly [B, A]>>
  ): Effect.Effect<R, E, B>
}
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## setAndGet

**Signature**

```ts
export declare const setAndGet: {
  <A>(value: A): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, value: A): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## update

**Signature**

```ts
export declare const update: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## updateAndGet

**Signature**

```ts
export declare const updateAndGet: {
  <A>(f: (a: A) => A): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, f: (a: A) => A): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## updateAndGetEffect

**Signature**

```ts
export declare const updateAndGetEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## updateEffect

**Signature**

```ts
export declare const updateEffect: {
  <A, R, E>(f: (a: A) => Effect.Effect<R, E, A>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, void>
  <A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<R, E, A>): Effect.Effect<R, E, void>
}
```

Added in v1.0.0

## updateSome

**Signature**

```ts
export declare const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref.Ref<A>, f: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## updateSomeAndGet

**Signature**

```ts
export declare const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref.Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref.Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## updateSomeAndGetEffect

**Signature**

```ts
export declare const updateSomeAndGetEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): (self: SynchronizedRef<A>) => Effect.Effect<R, E, A>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## updateSomeEffect

**Signature**

```ts
export declare const updateSomeEffect: {
  <A, R, E>(pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): (
    self: SynchronizedRef<A>
  ) => Effect.Effect<R, E, void>
  <A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<Effect.Effect<R, E, A>>): Effect.Effect<R, E, void>
}
```

Added in v1.0.0
