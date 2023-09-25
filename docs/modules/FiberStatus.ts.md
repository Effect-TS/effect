---
title: FiberStatus.ts
nav_order: 32
parent: Modules
---

## FiberStatus overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [done](#done)
  - [running](#running)
  - [suspended](#suspended)
- [models](#models)
  - [Done (interface)](#done-interface)
  - [FiberStatus (type alias)](#fiberstatus-type-alias)
  - [Running (interface)](#running-interface)
  - [Suspended (interface)](#suspended-interface)
- [refinements](#refinements)
  - [isDone](#isdone)
  - [isFiberStatus](#isfiberstatus)
  - [isRunning](#isrunning)
  - [isSuspended](#issuspended)
- [symbols](#symbols)
  - [FiberStatusTypeId](#fiberstatustypeid)
  - [FiberStatusTypeId (type alias)](#fiberstatustypeid-type-alias)

---

# constructors

## done

**Signature**

```ts
export declare const done: FiberStatus
```

Added in v1.0.0

## running

**Signature**

```ts
export declare const running: (runtimeFlags: RuntimeFlags.RuntimeFlags) => FiberStatus
```

Added in v1.0.0

## suspended

**Signature**

```ts
export declare const suspended: (runtimeFlags: RuntimeFlags.RuntimeFlags, blockingOn: FiberId.FiberId) => FiberStatus
```

Added in v1.0.0

# models

## Done (interface)

**Signature**

```ts
export interface Done extends Equal.Equal {
  readonly _tag: 'Done'
  readonly [FiberStatusTypeId]: FiberStatusTypeId
}
```

Added in v1.0.0

## FiberStatus (type alias)

**Signature**

```ts
export type FiberStatus = Done | Running | Suspended
```

Added in v1.0.0

## Running (interface)

**Signature**

```ts
export interface Running extends Equal.Equal {
  readonly _tag: 'Running'
  readonly [FiberStatusTypeId]: FiberStatusTypeId
  readonly runtimeFlags: RuntimeFlags.RuntimeFlags
}
```

Added in v1.0.0

## Suspended (interface)

**Signature**

```ts
export interface Suspended extends Equal.Equal {
  readonly _tag: 'Suspended'
  readonly [FiberStatusTypeId]: FiberStatusTypeId
  readonly runtimeFlags: RuntimeFlags.RuntimeFlags
  readonly blockingOn: FiberId.FiberId
}
```

Added in v1.0.0

# refinements

## isDone

Returns `true` if the specified `FiberStatus` is `Done`, `false` otherwise.

**Signature**

```ts
export declare const isDone: (self: FiberStatus) => self is Done
```

Added in v1.0.0

## isFiberStatus

Returns `true` if the specified value is a `FiberStatus`, `false` otherwise.

**Signature**

```ts
export declare const isFiberStatus: (u: unknown) => u is FiberStatus
```

Added in v1.0.0

## isRunning

Returns `true` if the specified `FiberStatus` is `Running`, `false`
otherwise.

**Signature**

```ts
export declare const isRunning: (self: FiberStatus) => self is Running
```

Added in v1.0.0

## isSuspended

Returns `true` if the specified `FiberStatus` is `Suspended`, `false`
otherwise.

**Signature**

```ts
export declare const isSuspended: (self: FiberStatus) => self is Suspended
```

Added in v1.0.0

# symbols

## FiberStatusTypeId

**Signature**

```ts
export declare const FiberStatusTypeId: typeof FiberStatusTypeId
```

Added in v1.0.0

## FiberStatusTypeId (type alias)

**Signature**

```ts
export type FiberStatusTypeId = typeof FiberStatusTypeId
```

Added in v1.0.0
