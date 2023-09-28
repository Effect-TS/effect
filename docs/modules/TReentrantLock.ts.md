---
title: TReentrantLock.ts
nav_order: 133
parent: Modules
---

## TReentrantLock overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [models](#models)
  - [TReentrantLock (interface)](#treentrantlock-interface)
- [mutations](#mutations)
  - [acquireRead](#acquireread)
  - [acquireWrite](#acquirewrite)
  - [fiberReadLocks](#fiberreadlocks)
  - [fiberWriteLocks](#fiberwritelocks)
  - [lock](#lock)
  - [locked](#locked)
  - [readLock](#readlock)
  - [readLocked](#readlocked)
  - [readLocks](#readlocks)
  - [releaseRead](#releaseread)
  - [releaseWrite](#releasewrite)
  - [withLock](#withlock)
  - [withReadLock](#withreadlock)
  - [withWriteLock](#withwritelock)
  - [writeLock](#writelock)
  - [writeLocked](#writelocked)
  - [writeLocks](#writelocks)
- [symbols](#symbols)
  - [TReentrantLockTypeId](#treentrantlocktypeid)
  - [TReentrantLockTypeId (type alias)](#treentrantlocktypeid-type-alias)
- [utils](#utils)
  - [TReentrantLock (namespace)](#treentrantlock-namespace)
    - [Proto (interface)](#proto-interface)

---

# constructors

## make

Makes a new reentrant read/write lock.

**Signature**

```ts
export declare const make: STM.STM<never, never, TReentrantLock>
```

Added in v1.0.0

# models

## TReentrantLock (interface)

A `TReentrantLock` is a reentrant read/write lock. Multiple readers may all
concurrently acquire read locks. Only one writer is allowed to acquire a
write lock at any given time. Read locks may be upgraded into write locks. A
fiber that has a write lock may acquire other write locks or read locks.

The two primary methods of this structure are `readLock`, which acquires a
read lock in a scoped context, and `writeLock`, which acquires a write lock
in a scoped context.

Although located in the STM package, there is no need for locks within STM
transactions. However, this lock can be quite useful in effectful code, to
provide consistent read/write access to mutable state; and being in STM
allows this structure to be composed into more complicated concurrent
structures that are consumed from effectful code.

**Signature**

```ts
export interface TReentrantLock extends TReentrantLock.Proto {}
```

Added in v1.0.0

# mutations

## acquireRead

Acquires a read lock. The transaction will suspend until no other fiber is
holding a write lock. Succeeds with the number of read locks held by this
fiber.

**Signature**

```ts
export declare const acquireRead: (self: TReentrantLock) => STM.STM<never, never, number>
```

Added in v1.0.0

## acquireWrite

Acquires a write lock. The transaction will suspend until no other fibers
are holding read or write locks. Succeeds with the number of write locks
held by this fiber.

**Signature**

```ts
export declare const acquireWrite: (self: TReentrantLock) => STM.STM<never, never, number>
```

Added in v1.0.0

## fiberReadLocks

Retrieves the number of acquired read locks for this fiber.

**Signature**

```ts
export declare const fiberReadLocks: (self: TReentrantLock) => STM.STM<never, never, number>
```

Added in v1.0.0

## fiberWriteLocks

Retrieves the number of acquired write locks for this fiber.

**Signature**

```ts
export declare const fiberWriteLocks: (self: TReentrantLock) => STM.STM<never, never, number>
```

Added in v1.0.0

## lock

Just a convenience method for applications that only need reentrant locks,
without needing a distinction between readers / writers.

See `TReentrantLock.writeLock`.

**Signature**

```ts
export declare const lock: (self: TReentrantLock) => Effect.Effect<Scope.Scope, never, number>
```

Added in v1.0.0

## locked

Determines if any fiber has a read or write lock.

**Signature**

```ts
export declare const locked: (self: TReentrantLock) => STM.STM<never, never, boolean>
```

Added in v1.0.0

## readLock

Obtains a read lock in a scoped context.

**Signature**

```ts
export declare const readLock: (self: TReentrantLock) => Effect.Effect<Scope.Scope, never, number>
```

Added in v1.0.0

## readLocked

Determines if any fiber has a read lock.

**Signature**

```ts
export declare const readLocked: (self: TReentrantLock) => STM.STM<never, never, boolean>
```

Added in v1.0.0

## readLocks

Retrieves the total number of acquired read locks.

**Signature**

```ts
export declare const readLocks: (self: TReentrantLock) => STM.STM<never, never, number>
```

Added in v1.0.0

## releaseRead

Releases a read lock held by this fiber. Succeeds with the outstanding
number of read locks held by this fiber.

**Signature**

```ts
export declare const releaseRead: (self: TReentrantLock) => STM.STM<never, never, number>
```

Added in v1.0.0

## releaseWrite

Releases a write lock held by this fiber. Succeeds with the outstanding
number of write locks held by this fiber.

**Signature**

```ts
export declare const releaseWrite: (self: TReentrantLock) => STM.STM<never, never, number>
```

Added in v1.0.0

## withLock

Runs the specified workflow with a lock.

**Signature**

```ts
export declare const withLock: {
  (self: TReentrantLock): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, self: TReentrantLock): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## withReadLock

Runs the specified workflow with a read lock.

**Signature**

```ts
export declare const withReadLock: {
  (self: TReentrantLock): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, self: TReentrantLock): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## withWriteLock

Runs the specified workflow with a write lock.

**Signature**

```ts
export declare const withWriteLock: {
  (self: TReentrantLock): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(effect: Effect.Effect<R, E, A>, self: TReentrantLock): Effect.Effect<R, E, A>
}
```

Added in v1.0.0

## writeLock

Obtains a write lock in a scoped context.

**Signature**

```ts
export declare const writeLock: (self: TReentrantLock) => Effect.Effect<Scope.Scope, never, number>
```

Added in v1.0.0

## writeLocked

Determines if a write lock is held by some fiber.

**Signature**

```ts
export declare const writeLocked: (self: TReentrantLock) => STM.STM<never, never, boolean>
```

Added in v1.0.0

## writeLocks

Computes the number of write locks held by fibers.

**Signature**

```ts
export declare const writeLocks: (self: TReentrantLock) => STM.STM<never, never, number>
```

Added in v1.0.0

# symbols

## TReentrantLockTypeId

**Signature**

```ts
export declare const TReentrantLockTypeId: typeof TReentrantLockTypeId
```

Added in v1.0.0

## TReentrantLockTypeId (type alias)

**Signature**

```ts
export type TReentrantLockTypeId = typeof TReentrantLockTypeId
```

Added in v1.0.0

# utils

## TReentrantLock (namespace)

Added in v1.0.0

### Proto (interface)

**Signature**

```ts
export interface Proto {
  readonly [TReentrantLockTypeId]: TReentrantLockTypeId
}
```

Added in v1.0.0
