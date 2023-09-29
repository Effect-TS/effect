---
title: FiberRefsPatch.ts
nav_order: 41
parent: Modules
---

## FiberRefsPatch overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [combine](#combine)
  - [diff](#diff)
  - [empty](#empty)
- [destructors](#destructors)
  - [patch](#patch)
- [models](#models)
  - [Add (interface)](#add-interface)
  - [AndThen (interface)](#andthen-interface)
  - [Empty (interface)](#empty-interface)
  - [FiberRefsPatch (type alias)](#fiberrefspatch-type-alias)
  - [Remove (interface)](#remove-interface)
  - [Update (interface)](#update-interface)

---

# constructors

## combine

Combines this patch and the specified patch to create a new patch that
describes applying the changes from this patch and the specified patch
sequentially.

**Signature**

```ts
export declare const combine: {
  (that: FiberRefsPatch): (self: FiberRefsPatch) => FiberRefsPatch
  (self: FiberRefsPatch, that: FiberRefsPatch): FiberRefsPatch
}
```

Added in v2.0.0

## diff

Constructs a patch that describes the changes between the specified
collections of `FiberRef`

**Signature**

```ts
export declare const diff: (oldValue: FiberRefs.FiberRefs, newValue: FiberRefs.FiberRefs) => FiberRefsPatch
```

Added in v2.0.0

## empty

**Signature**

```ts
export declare const empty: FiberRefsPatch
```

Added in v2.0.0

# destructors

## patch

Applies the changes described by this patch to the specified collection
of `FiberRef` values.

**Signature**

```ts
export declare const patch: {
  (fiberId: FiberId.Runtime, oldValue: FiberRefs.FiberRefs): (self: FiberRefsPatch) => FiberRefs.FiberRefs
  (self: FiberRefsPatch, fiberId: FiberId.Runtime, oldValue: FiberRefs.FiberRefs): FiberRefs.FiberRefs
}
```

Added in v2.0.0

# models

## Add (interface)

**Signature**

```ts
export interface Add {
  readonly _tag: 'Add'
  readonly fiberRef: FiberRef.FiberRef<unknown>
  readonly value: unknown
}
```

Added in v2.0.0

## AndThen (interface)

**Signature**

```ts
export interface AndThen {
  readonly _tag: 'AndThen'
  readonly first: FiberRefsPatch
  readonly second: FiberRefsPatch
}
```

Added in v2.0.0

## Empty (interface)

**Signature**

```ts
export interface Empty {
  readonly _tag: 'Empty'
}
```

Added in v2.0.0

## FiberRefsPatch (type alias)

A `FiberRefsPatch` captures the changes in `FiberRef` values made by a single
fiber as a value. This allows fibers to apply the changes made by a workflow
without inheriting all the `FiberRef` values of the fiber that executed the
workflow.

**Signature**

```ts
export type FiberRefsPatch = Empty | Add | Remove | Update | AndThen
```

Added in v2.0.0

## Remove (interface)

**Signature**

```ts
export interface Remove {
  readonly _tag: 'Remove'
  readonly fiberRef: FiberRef.FiberRef<unknown>
}
```

Added in v2.0.0

## Update (interface)

**Signature**

```ts
export interface Update {
  readonly _tag: 'Update'
  readonly fiberRef: FiberRef.FiberRef<unknown>
  readonly patch: unknown
}
```

Added in v2.0.0
