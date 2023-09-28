---
title: FiberRefs.ts
nav_order: 40
parent: Modules
---

## FiberRefs overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [empty](#empty)
- [getters](#getters)
  - [fiberRefs](#fiberrefs)
  - [get](#get)
  - [getOrDefault](#getordefault)
- [models](#models)
  - [FiberRefs (interface)](#fiberrefs-interface)
- [symbols](#symbols)
  - [FiberRefsSym](#fiberrefssym)
  - [FiberRefsSym (type alias)](#fiberrefssym-type-alias)
- [unsafe](#unsafe)
  - [unsafeMake](#unsafemake)
- [utils](#utils)
  - [delete](#delete)
  - [forkAs](#forkas)
  - [joinAs](#joinas)
  - [setAll](#setall)
  - [updatedAs](#updatedas)

---

# constructors

## empty

The empty collection of `FiberRef` values.

**Signature**

```ts
export declare const empty: () => FiberRefs
```

Added in v1.0.0

# getters

## fiberRefs

Returns a set of each `FiberRef` in this collection.

**Signature**

```ts
export declare const fiberRefs: (self: FiberRefs) => HashSet.HashSet<FiberRef.FiberRef<any>>
```

Added in v1.0.0

## get

Gets the value of the specified `FiberRef` in this collection of `FiberRef`
values if it exists or `None` otherwise.

**Signature**

```ts
export declare const get: {
  <A>(fiberRef: FiberRef.FiberRef<A>): (self: FiberRefs) => Option.Option<A>
  <A>(self: FiberRefs, fiberRef: FiberRef.FiberRef<A>): Option.Option<A>
}
```

Added in v1.0.0

## getOrDefault

Gets the value of the specified `FiberRef` in this collection of `FiberRef`
values if it exists or the `initial` value of the `FiberRef` otherwise.

**Signature**

```ts
export declare const getOrDefault: {
  <A>(fiberRef: FiberRef.FiberRef<A>): (self: FiberRefs) => A
  <A>(self: FiberRefs, fiberRef: FiberRef.FiberRef<A>): A
}
```

Added in v1.0.0

# models

## FiberRefs (interface)

`FiberRefs` is a data type that represents a collection of `FiberRef` values.

This allows safely propagating `FiberRef` values across fiber boundaries, for
example between an asynchronous producer and consumer.

**Signature**

```ts
export interface FiberRefs extends Pipeable {
  readonly [FiberRefsSym]: FiberRefsSym
  readonly locals: Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>>
}
```

Added in v1.0.0

# symbols

## FiberRefsSym

**Signature**

```ts
export declare const FiberRefsSym: typeof FiberRefsSym
```

Added in v1.0.0

## FiberRefsSym (type alias)

**Signature**

```ts
export type FiberRefsSym = typeof FiberRefsSym
```

Added in v1.0.0

# unsafe

## unsafeMake

Note: it will not copy the provided Map, make sure to provide a fresh one.

**Signature**

```ts
export declare const unsafeMake: (
  fiberRefLocals: Map<FiberRef.FiberRef<any>, Arr.NonEmptyReadonlyArray<readonly [FiberId.Runtime, any]>>
) => FiberRefs
```

Added in v1.0.0

# utils

## delete

Deletes the specified `FiberRef` from the `FibterRefs`.

**Signature**

```ts
export declare const delete: { <A>(fiberRef: FiberRef.FiberRef<A>): (self: FiberRefs) => FiberRefs; <A>(self: FiberRefs, fiberRef: FiberRef.FiberRef<A>): FiberRefs; }
```

Added in v1.0.0

## forkAs

Forks this collection of fiber refs as the specified child fiber id. This
will potentially modify the value of the fiber refs, as determined by the
individual fiber refs that make up the collection.

**Signature**

```ts
export declare const forkAs: {
  (childId: FiberId.Runtime): (self: FiberRefs) => FiberRefs
  (self: FiberRefs, childId: FiberId.Runtime): FiberRefs
}
```

Added in v1.0.0

## joinAs

Joins this collection of fiber refs to the specified collection, as the
specified fiber id. This will perform diffing and merging to ensure
preservation of maximum information from both child and parent refs.

**Signature**

```ts
export declare const joinAs: {
  (fiberId: FiberId.Runtime, that: FiberRefs): (self: FiberRefs) => FiberRefs
  (self: FiberRefs, fiberId: FiberId.Runtime, that: FiberRefs): FiberRefs
}
```

Added in v1.0.0

## setAll

Set each ref to either its value or its default.

**Signature**

```ts
export declare const setAll: (self: FiberRefs) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## updatedAs

Updates the value of the specified `FiberRef` using the provided `FiberId`

**Signature**

```ts
export declare const updatedAs: {
  <A>(options: { readonly fiberId: FiberId.Runtime; readonly fiberRef: FiberRef.FiberRef<A>; readonly value: A }): (
    self: FiberRefs
  ) => FiberRefs
  <A>(
    self: FiberRefs,
    options: { readonly fiberId: FiberId.Runtime; readonly fiberRef: FiberRef.FiberRef<A>; readonly value: A }
  ): FiberRefs
}
```

Added in v1.0.0
