---
title: ScopedRef.ts
nav_order: 103
parent: Modules
---

## ScopedRef overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [fromAcquire](#fromacquire)
  - [make](#make)
- [getters](#getters)
  - [get](#get)
  - [set](#set)
- [models](#models)
  - [ScopedRef (interface)](#scopedref-interface)
- [symbols](#symbols)
  - [ScopedRefTypeId](#scopedreftypeid)
  - [ScopedRefTypeId (type alias)](#scopedreftypeid-type-alias)
- [utils](#utils)
  - [ScopedRef (namespace)](#scopedref-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## fromAcquire

Creates a new `ScopedRef` from an effect that resourcefully produces a
value.

**Signature**

```ts
export declare const fromAcquire: <R, E, A>(
  acquire: Effect.Effect<R, E, A>
) => Effect.Effect<Scope.Scope | R, E, ScopedRef<A>>
```

Added in v1.0.0

## make

Creates a new `ScopedRef` from the specified value. This method should
not be used for values whose creation require the acquisition of resources.

**Signature**

```ts
export declare const make: <A>(evaluate: LazyArg<A>) => Effect.Effect<Scope.Scope, never, ScopedRef<A>>
```

Added in v1.0.0

# getters

## get

Retrieves the current value of the scoped reference.

**Signature**

```ts
export declare const get: <A>(self: ScopedRef<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

## set

Sets the value of this reference to the specified resourcefully-created
value. Any resources associated with the old value will be released.

This method will not return until either the reference is successfully
changed to the new value, with old resources released, or until the attempt
to acquire a new value fails.

**Signature**

```ts
export declare const set: {
  <A, R, E>(acquire: Effect.Effect<R, E, A>): (self: ScopedRef<A>) => Effect.Effect<Exclude<R, Scope.Scope>, E, void>
  <A, R, E>(self: ScopedRef<A>, acquire: Effect.Effect<R, E, A>): Effect.Effect<Exclude<R, Scope.Scope>, E, void>
}
```

Added in v1.0.0

# models

## ScopedRef (interface)

A `ScopedRef` is a reference whose value is associated with resources,
which must be released properly. You can both get the current value of any
`ScopedRef`, as well as set it to a new value (which may require new
resources). The reference itself takes care of properly releasing resources
for the old value whenever a new value is obtained.

**Signature**

```ts
export interface ScopedRef<A> extends ScopedRef.Variance<A>, Pipeable {
  /** @internal */
  readonly ref: Synchronized.SynchronizedRef<readonly [Scope.Scope.Closeable, A]>
}
```

Added in v1.0.0

# symbols

## ScopedRefTypeId

**Signature**

```ts
export declare const ScopedRefTypeId: typeof ScopedRefTypeId
```

Added in v1.0.0

## ScopedRefTypeId (type alias)

**Signature**

```ts
export type ScopedRefTypeId = typeof ScopedRefTypeId
```

Added in v1.0.0

# utils

## ScopedRef (namespace)

Added in v1.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [ScopedRefTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v1.0.0
