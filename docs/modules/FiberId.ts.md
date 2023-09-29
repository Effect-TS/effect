---
title: FiberId.ts
nav_order: 38
parent: Modules
---

## FiberId overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [combine](#combine)
  - [combineAll](#combineall)
  - [composite](#composite)
  - [make](#make)
  - [none](#none)
  - [runtime](#runtime)
- [destructors](#destructors)
  - [ids](#ids)
  - [threadName](#threadname)
  - [toOption](#tooption)
  - [toSet](#toset)
- [models](#models)
  - [Composite (interface)](#composite-interface)
  - [FiberId (type alias)](#fiberid-type-alias)
  - [None (interface)](#none-interface)
  - [Runtime (interface)](#runtime-interface)
- [refinements](#refinements)
  - [isComposite](#iscomposite)
  - [isFiberId](#isfiberid)
  - [isNone](#isnone)
  - [isRuntime](#isruntime)
- [symbols](#symbols)
  - [FiberIdTypeId](#fiberidtypeid)
  - [FiberIdTypeId (type alias)](#fiberidtypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeMake](#unsafemake)
- [utils](#utils)
  - [getOrElse](#getorelse)

---

# constructors

## combine

Combine two `FiberId`s.

**Signature**

```ts
export declare const combine: { (that: FiberId): (self: FiberId) => FiberId; (self: FiberId, that: FiberId): FiberId }
```

Added in v1.0.0

## combineAll

Combines a set of `FiberId`s into a single `FiberId`.

**Signature**

```ts
export declare const combineAll: (fiberIds: HashSet.HashSet<FiberId>) => FiberId
```

Added in v1.0.0

## composite

**Signature**

```ts
export declare const composite: (left: FiberId, right: FiberId) => FiberId
```

Added in v1.0.0

## make

Creates a new `FiberId`.

**Signature**

```ts
export declare const make: (id: number, startTimeSeconds: number) => FiberId
```

Added in v1.0.0

## none

**Signature**

```ts
export declare const none: FiberId
```

Added in v1.0.0

## runtime

**Signature**

```ts
export declare const runtime: (id: number, startTimeMillis: number) => FiberId
```

Added in v1.0.0

# destructors

## ids

Get the set of identifiers for this `FiberId`.

**Signature**

```ts
export declare const ids: (self: FiberId) => HashSet.HashSet<number>
```

Added in v1.0.0

## threadName

Creates a string representing the name of the current thread of execution
represented by the specified `FiberId`.

**Signature**

```ts
export declare const threadName: (self: FiberId) => string
```

Added in v1.0.0

## toOption

Convert a `FiberId` into an `Option<FiberId>`.

**Signature**

```ts
export declare const toOption: (self: FiberId) => Option.Option<FiberId>
```

Added in v1.0.0

## toSet

Convert a `FiberId` into a `HashSet<FiberId>`.

**Signature**

```ts
export declare const toSet: (self: FiberId) => HashSet.HashSet<Runtime>
```

Added in v1.0.0

# models

## Composite (interface)

**Signature**

```ts
export interface Composite extends Equal.Equal, Inspectable {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: 'Composite'
  readonly left: FiberId
  readonly right: FiberId
}
```

Added in v1.0.0

## FiberId (type alias)

**Signature**

```ts
export type FiberId = None | Runtime | Composite
```

Added in v1.0.0

## None (interface)

**Signature**

```ts
export interface None extends Equal.Equal, Inspectable {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: 'None'
}
```

Added in v1.0.0

## Runtime (interface)

**Signature**

```ts
export interface Runtime extends Equal.Equal, Inspectable {
  readonly [FiberIdTypeId]: FiberIdTypeId
  readonly _tag: 'Runtime'
  readonly id: number
  readonly startTimeMillis: number
}
```

Added in v1.0.0

# refinements

## isComposite

Returns `true` if the `FiberId` is a `Composite`, `false` otherwise.

**Signature**

```ts
export declare const isComposite: (self: FiberId) => self is Composite
```

Added in v1.0.0

## isFiberId

Returns `true` if the specified unknown value is a `FiberId`, `false`
otherwise.

**Signature**

```ts
export declare const isFiberId: (self: unknown) => self is FiberId
```

Added in v1.0.0

## isNone

Returns `true` if the `FiberId` is a `None`, `false` otherwise.

**Signature**

```ts
export declare const isNone: (self: FiberId) => self is None
```

Added in v1.0.0

## isRuntime

Returns `true` if the `FiberId` is a `Runtime`, `false` otherwise.

**Signature**

```ts
export declare const isRuntime: (self: FiberId) => self is Runtime
```

Added in v1.0.0

# symbols

## FiberIdTypeId

**Signature**

```ts
export declare const FiberIdTypeId: typeof FiberIdTypeId
```

Added in v1.0.0

## FiberIdTypeId (type alias)

**Signature**

```ts
export type FiberIdTypeId = typeof FiberIdTypeId
```

Added in v1.0.0

# unsafe

## unsafeMake

Unsafely creates a new `FiberId`.

**Signature**

```ts
export declare const unsafeMake: (_: void) => Runtime
```

Added in v1.0.0

# utils

## getOrElse

Returns this `FiberId` if it is not `None`, otherwise returns that `FiberId`.

**Signature**

```ts
export declare const getOrElse: { (that: FiberId): (self: FiberId) => FiberId; (self: FiberId, that: FiberId): FiberId }
```

Added in v1.0.0
