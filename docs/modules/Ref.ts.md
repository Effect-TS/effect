---
title: Ref.ts
nav_order: 88
parent: Modules
---

## Ref overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [getters](#getters)
  - [get](#get)
- [models](#models)
  - [Ref (interface)](#ref-interface)
  - [Ref (namespace)](#ref-namespace)
    - [Variance (interface)](#variance-interface)
- [symbols](#symbols)
  - [RefTypeId](#reftypeid)
  - [RefTypeId (type alias)](#reftypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeMake](#unsafemake)
- [utils](#utils)
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

---

# constructors

## make

**Signature**

```ts
export declare const make: <A>(value: A) => Effect.Effect<never, never, Ref<A>>
```

Added in v2.0.0

# getters

## get

**Signature**

```ts
export declare const get: <A>(self: Ref<A>) => Effect.Effect<never, never, A>
```

Added in v2.0.0

# models

## Ref (interface)

**Signature**

```ts
export interface Ref<A> extends Ref.Variance<A>, Pipeable {
  modify<B>(f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
}
```

Added in v2.0.0

## Ref (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [RefTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0

# symbols

## RefTypeId

**Signature**

```ts
export declare const RefTypeId: typeof RefTypeId
```

Added in v2.0.0

## RefTypeId (type alias)

**Signature**

```ts
export type RefTypeId = typeof RefTypeId
```

Added in v2.0.0

# unsafe

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: <A>(value: A) => Ref<A>
```

Added in v2.0.0

# utils

## getAndSet

**Signature**

```ts
export declare const getAndSet: {
  <A>(value: A): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, value: A): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: {
  <A>(f: (a: A) => A): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, f: (a: A) => A): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## modify

**Signature**

```ts
export declare const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: Ref<A>) => Effect.Effect<never, never, B>
  <A, B>(self: Ref<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
}
```

Added in v2.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: {
  <B, A>(fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>): (self: Ref<A>) => Effect.Effect<never, never, B>
  <A, B>(self: Ref<A>, fallback: B, pf: (a: A) => Option.Option<readonly [B, A]>): Effect.Effect<never, never, B>
}
```

Added in v2.0.0

## set

**Signature**

```ts
export declare const set: {
  <A>(value: A): (self: Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref<A>, value: A): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## setAndGet

**Signature**

```ts
export declare const setAndGet: {
  <A>(value: A): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, value: A): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## update

**Signature**

```ts
export declare const update: {
  <A>(f: (a: A) => A): (self: Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref<A>, f: (a: A) => A): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## updateAndGet

**Signature**

```ts
export declare const updateAndGet: {
  <A>(f: (a: A) => A): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, f: (a: A) => A): Effect.Effect<never, never, A>
}
```

Added in v2.0.0

## updateSome

**Signature**

```ts
export declare const updateSome: {
  <A>(f: (a: A) => Option.Option<A>): (self: Ref<A>) => Effect.Effect<never, never, void>
  <A>(self: Ref<A>, f: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
}
```

Added in v2.0.0

## updateSomeAndGet

**Signature**

```ts
export declare const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: Ref<A>) => Effect.Effect<never, never, A>
  <A>(self: Ref<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
}
```

Added in v2.0.0
