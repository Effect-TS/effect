---
title: TRef.ts
nav_order: 137
parent: Modules
---

## TRef overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [models](#models)
  - [TRef (interface)](#tref-interface)
- [mutations](#mutations)
  - [get](#get)
  - [getAndSet](#getandset)
  - [getAndUpdate](#getandupdate)
  - [getAndUpdateSome](#getandupdatesome)
  - [modify](#modify)
  - [modifySome](#modifysome)
  - [set](#set)
  - [setAndGet](#setandget)
  - [update](#update)
  - [updateAndGet](#updateandget)
  - [updateSome](#updatesome)
  - [updateSomeAndGet](#updatesomeandget)
- [symbols](#symbols)
  - [TRefTypeId](#treftypeid)
  - [TRefTypeId (type alias)](#treftypeid-type-alias)
- [utils](#utils)
  - [TRef (namespace)](#tref-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## make

**Signature**

```ts
export declare const make: <A>(value: A) => STM.STM<never, never, TRef<A>>
```

Added in v2.0.0

# models

## TRef (interface)

A `TRef<A>` is a purely functional description of a mutable reference that can
be modified as part of a transactional effect. The fundamental operations of
a `TRef` are `set` and `get`. `set` transactionally sets the reference to a
new value. `get` gets the current value of the reference.

NOTE: While `TRef<A>` provides the transactional equivalent of a mutable
reference, the value inside the `TRef` should be immutable.

**Signature**

```ts
export interface TRef<A> extends TRef.Variance<A> {
  /**
   * Note: the method is unbound, exposed only for potential extensions.
   */
  modify<B>(f: (a: A) => readonly [B, A]): STM.STM<never, never, B>
}
```

Added in v2.0.0

# mutations

## get

**Signature**

```ts
export declare const get: <A>(self: TRef<A>) => STM.STM<never, never, A>
```

Added in v2.0.0

## getAndSet

**Signature**

```ts
export declare const getAndSet: {
  <A>(value: A): (self: TRef<A>) => STM.STM<never, never, A>
  <A>(self: TRef<A>, value: A): STM.STM<never, never, A>
}
```

Added in v2.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: {
  <A>(f: (a: A) => A): (self: TRef<A>) => STM.STM<never, never, A>
  <A>(self: TRef<A>, f: (a: A) => A): STM.STM<never, never, A>
}
```

Added in v2.0.0

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: TRef<A>) => STM.STM<never, never, A>
  <A>(self: TRef<A>, f: (a: A) => Option.Option<A>): STM.STM<never, never, A>
}
```

Added in v2.0.0

## modify

**Signature**

```ts
export declare const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: TRef<A>) => STM.STM<never, never, B>
  <A, B>(self: TRef<A>, f: (a: A) => readonly [B, A]): STM.STM<never, never, B>
}
```

Added in v2.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: {
  <A, B>(fallback: B, f: (a: A) => Option.Option<readonly [B, A]>): (self: TRef<A>) => STM.STM<never, never, B>
  <A, B>(self: TRef<A>, fallback: B, f: (a: A) => Option.Option<readonly [B, A]>): STM.STM<never, never, B>
}
```

Added in v2.0.0

## set

**Signature**

```ts
export declare const set: {
  <A>(value: A): (self: TRef<A>) => STM.STM<never, never, void>
  <A>(self: TRef<A>, value: A): STM.STM<never, never, void>
}
```

Added in v2.0.0

## setAndGet

**Signature**

```ts
export declare const setAndGet: {
  <A>(value: A): (self: TRef<A>) => STM.STM<never, never, A>
  <A>(self: TRef<A>, value: A): STM.STM<never, never, A>
}
```

Added in v2.0.0

## update

**Signature**

```ts
export declare const update: {
  <A>(f: (a: A) => A): (self: TRef<A>) => STM.STM<never, never, void>
  <A>(self: TRef<A>, f: (a: A) => A): STM.STM<never, never, void>
}
```

Added in v2.0.0

## updateAndGet

**Signature**

```ts
export declare const updateAndGet: {
  <A>(f: (a: A) => A): (self: TRef<A>) => STM.STM<never, never, A>
  <A>(self: TRef<A>, f: (a: A) => A): STM.STM<never, never, A>
}
```

Added in v2.0.0

## updateSome

**Signature**

```ts
export declare const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: TRef<A>) => STM.STM<never, never, void>
  <A>(self: TRef<A>, f: (a: A) => Option.Option<A>): STM.STM<never, never, void>
}
```

Added in v2.0.0

## updateSomeAndGet

**Signature**

```ts
export declare const updateSomeAndGet: {
  <A>(f: (a: A) => Option.Option<A>): (self: TRef<A>) => STM.STM<never, never, A>
  <A>(self: TRef<A>, f: (a: A) => Option.Option<A>): STM.STM<never, never, A>
}
```

Added in v2.0.0

# symbols

## TRefTypeId

**Signature**

```ts
export declare const TRefTypeId: typeof TRefTypeId
```

Added in v2.0.0

## TRefTypeId (type alias)

**Signature**

```ts
export type TRefTypeId = typeof TRefTypeId
```

Added in v2.0.0

# utils

## TRef (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [TRefTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0
