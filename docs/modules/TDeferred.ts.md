---
title: TDeferred.ts
nav_order: 120
parent: Modules
---

## TDeferred overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [getters](#getters)
  - [await](#await)
  - [poll](#poll)
- [models](#models)
  - [TDeferred (interface)](#tdeferred-interface)
- [mutations](#mutations)
  - [done](#done)
  - [fail](#fail)
  - [succeed](#succeed)
- [symbols](#symbols)
  - [TDeferredTypeId](#tdeferredtypeid)
  - [TDeferredTypeId (type alias)](#tdeferredtypeid-type-alias)
- [utils](#utils)
  - [TDeferred (namespace)](#tdeferred-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## make

**Signature**

```ts
export declare const make: <E, A>() => STM.STM<never, never, TDeferred<E, A>>
```

Added in v2.0.0

# getters

## await

**Signature**

```ts
export declare const await: <E, A>(self: TDeferred<E, A>) => STM.STM<never, E, A>
```

Added in v2.0.0

## poll

**Signature**

```ts
export declare const poll: <E, A>(self: TDeferred<E, A>) => STM.STM<never, never, Option.Option<Either.Either<E, A>>>
```

Added in v2.0.0

# models

## TDeferred (interface)

**Signature**

```ts
export interface TDeferred<E, A> extends TDeferred.Variance<E, A> {}
```

Added in v2.0.0

# mutations

## done

**Signature**

```ts
export declare const done: {
  <E, A>(either: Either.Either<E, A>): (self: TDeferred<E, A>) => STM.STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, either: Either.Either<E, A>): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## fail

**Signature**

```ts
export declare const fail: {
  <E>(error: E): <A>(self: TDeferred<E, A>) => STM.STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, error: E): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

## succeed

**Signature**

```ts
export declare const succeed: {
  <A>(value: A): <E>(self: TDeferred<E, A>) => STM.STM<never, never, boolean>
  <E, A>(self: TDeferred<E, A>, value: A): STM.STM<never, never, boolean>
}
```

Added in v2.0.0

# symbols

## TDeferredTypeId

**Signature**

```ts
export declare const TDeferredTypeId: typeof TDeferredTypeId
```

Added in v2.0.0

## TDeferredTypeId (type alias)

**Signature**

```ts
export type TDeferredTypeId = typeof TDeferredTypeId
```

Added in v2.0.0

# utils

## TDeferred (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<E, A> {
  readonly [TDeferredTypeId]: {
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0
