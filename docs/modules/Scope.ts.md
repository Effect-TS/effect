---
title: Scope.ts
nav_order: 99
parent: Modules
---

## Scope overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
- [context](#context)
  - [Scope](#scope)
- [destructors](#destructors)
  - [close](#close)
  - [use](#use)
- [models](#models)
  - [CloseableScope (interface)](#closeablescope-interface)
  - [Scope (interface)](#scope-interface)
- [symbols](#symbols)
  - [CloseableScopeTypeId](#closeablescopetypeid)
  - [CloseableScopeTypeId (type alias)](#closeablescopetypeid-type-alias)
  - [ScopeTypeId](#scopetypeid)
  - [ScopeTypeId (type alias)](#scopetypeid-type-alias)
- [utils](#utils)
  - [Scope (namespace)](#scope-namespace)
    - [Closeable (type alias)](#closeable-type-alias)
    - [Finalizer (type alias)](#finalizer-type-alias)
  - [addFinalizer](#addfinalizer)
  - [addFinalizerExit](#addfinalizerexit)
  - [extend](#extend)
  - [fork](#fork)

---

# constructors

## make

Creates a Scope where Finalizers will run according to the `ExecutionStrategy`.

If an ExecutionStrategy is not provided `sequential` will be used.

**Signature**

```ts
export declare const make: (
  executionStrategy?: ExecutionStrategy.ExecutionStrategy
) => Effect<never, never, CloseableScope>
```

Added in v2.0.0

# context

## Scope

**Signature**

```ts
export declare const Scope: Context.Tag<Scope, Scope>
```

Added in v2.0.0

# destructors

## close

Closes a scope with the specified exit value, running all finalizers that
have been added to the scope.

**Signature**

```ts
export declare const close: (
  self: CloseableScope,
  exit: Exit.Exit<unknown, unknown>
) => Effect<never, never, void>
```

Added in v2.0.0

## use

Uses the scope by providing it to an `Effect` workflow that needs a scope,
guaranteeing that the scope is closed with the result of that workflow as
soon as the workflow completes execution, whether by success, failure, or
interruption.

**Signature**

```ts
export declare const use: {
  (scope: CloseableScope): <R, E, A>(effect: Effect<R, E, A>) => Effect<Exclude<R, Scope>, E, A>
  <R, E, A>(effect: Effect<R, E, A>, scope: CloseableScope): Effect<Exclude<R, Scope>, E, A>
}
```

Added in v2.0.0

# models

## CloseableScope (interface)

**Signature**

```ts
export interface CloseableScope extends Scope, Pipeable {
  readonly [CloseableScopeTypeId]: CloseableScopeTypeId

  /**
   * @internal
   */
  readonly close: (exit: Exit.Exit<unknown, unknown>) => Effect<never, never, void>
}
```

Added in v2.0.0

## Scope (interface)

**Signature**

```ts
export interface Scope extends Pipeable {
  readonly [ScopeTypeId]: ScopeTypeId
  readonly strategy: ExecutionStrategy.ExecutionStrategy
  /**
   * @internal
   */
  readonly fork: (strategy: ExecutionStrategy.ExecutionStrategy) => Effect<never, never, Scope.Closeable>
  /**
   * @internal
   */
  readonly addFinalizer: (finalizer: Scope.Finalizer) => Effect<never, never, void>
}
```

Added in v2.0.0

# symbols

## CloseableScopeTypeId

**Signature**

```ts
export declare const CloseableScopeTypeId: typeof CloseableScopeTypeId
```

Added in v2.0.0

## CloseableScopeTypeId (type alias)

**Signature**

```ts
export type CloseableScopeTypeId = typeof CloseableScopeTypeId
```

Added in v2.0.0

## ScopeTypeId

**Signature**

```ts
export declare const ScopeTypeId: typeof ScopeTypeId
```

Added in v2.0.0

## ScopeTypeId (type alias)

**Signature**

```ts
export type ScopeTypeId = typeof ScopeTypeId
```

Added in v2.0.0

# utils

## Scope (namespace)

Added in v2.0.0

### Closeable (type alias)

**Signature**

```ts
export type Closeable = CloseableScope
```

Added in v2.0.0

### Finalizer (type alias)

**Signature**

```ts
export type Finalizer = (exit: Exit.Exit<unknown, unknown>) => Effect<never, never, void>
```

Added in v2.0.0

## addFinalizer

Adds a finalizer to this scope. The finalizer is guaranteed to be run when
the scope is closed.

**Signature**

```ts
export declare const addFinalizer: (
  self: Scope,
  finalizer: Effect<never, never, unknown>
) => Effect<never, never, void>
```

Added in v2.0.0

## addFinalizerExit

A simplified version of `addFinalizerWith` when the `finalizer` does not
depend on the `Exit` value that the scope is closed with.

**Signature**

```ts
export declare const addFinalizerExit: (self: Scope, finalizer: Scope.Finalizer) => Effect<never, never, void>
```

Added in v2.0.0

## extend

Extends the scope of an `Effect` workflow that needs a scope into this
scope by providing it to the workflow but not closing the scope when the
workflow completes execution. This allows extending a scoped value into a
larger scope.

**Signature**

```ts
export declare const extend: {
  (scope: Scope): <R, E, A>(effect: Effect<R, E, A>) => Effect<Exclude<R, Scope>, E, A>
  <R, E, A>(effect: Effect<R, E, A>, scope: Scope): Effect<Exclude<R, Scope>, E, A>
}
```

Added in v2.0.0

## fork

Forks a new scope that is a child of this scope. The child scope will
automatically be closed when this scope is closed.

**Signature**

```ts
export declare const fork: (
  self: Scope,
  strategy: ExecutionStrategy.ExecutionStrategy
) => Effect<never, never, CloseableScope>
```

Added in v2.0.0
