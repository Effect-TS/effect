---
title: Runtime.ts
nav_order: 91
parent: Modules
---

## Runtime overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [defaultRuntime](#defaultruntime)
  - [defaultRuntimeFlags](#defaultruntimeflags)
  - [make](#make)
  - [makeFiberFailure](#makefiberfailure)
- [execution](#execution)
  - [runCallback](#runcallback)
  - [runFork](#runfork)
  - [runPromise](#runpromise)
  - [runPromiseExit](#runpromiseexit)
  - [runSync](#runsync)
  - [runSyncExit](#runsyncexit)
- [exports](#exports)
  - [FiberFailureCauseId (type alias)](#fiberfailurecauseid-type-alias)
- [guards](#guards)
  - [isAsyncFiberException](#isasyncfiberexception)
  - [isFiberFailure](#isfiberfailure)
- [models](#models)
  - [AsyncFiberException (interface)](#asyncfiberexception-interface)
  - [Cancel (interface)](#cancel-interface)
  - [FiberFailure (interface)](#fiberfailure-interface)
  - [RunForkOptions (interface)](#runforkoptions-interface)
  - [Runtime (interface)](#runtime-interface)
- [symbols](#symbols)
  - [FiberFailureCauseId](#fiberfailurecauseid)
  - [FiberFailureId](#fiberfailureid)
  - [FiberFailureId (type alias)](#fiberfailureid-type-alias)

---

# constructors

## defaultRuntime

**Signature**

```ts
export declare const defaultRuntime: Runtime<never>
```

Added in v2.0.0

## defaultRuntimeFlags

**Signature**

```ts
export declare const defaultRuntimeFlags: RuntimeFlags.RuntimeFlags
```

Added in v2.0.0

## make

**Signature**

```ts
export declare const make: <R>(options: {
  readonly context: Context.Context<R>
  readonly runtimeFlags: RuntimeFlags.RuntimeFlags
  readonly fiberRefs: FiberRefs.FiberRefs
}) => Runtime<R>
```

Added in v2.0.0

## makeFiberFailure

**Signature**

```ts
export declare const makeFiberFailure: <E>(cause: Cause<E>) => FiberFailure
```

Added in v2.0.0

# execution

## runCallback

Executes the effect asynchronously, eventually passing the exit value to
the specified callback.

This method is effectful and should only be invoked at the edges of your
program.

**Signature**

```ts
export declare const runCallback: <R>(
  runtime: Runtime<R>,
) => <E, A>(
  effect: Effect.Effect<R, E, A>,
  onExit?: ((exit: Exit.Exit<E, A>) => void) | undefined,
) => (fiberId?: FiberId.FiberId | undefined, onExit?: ((exit: Exit.Exit<E, A>) => void) | undefined) => void
```

Added in v2.0.0

## runFork

Executes the effect using the provided Scheduler or using the global
Scheduler if not provided

**Signature**

```ts
export declare const runFork: <R>(
  runtime: Runtime<R>,
) => <E, A>(self: Effect.Effect<R, E, A>, options?: RunForkOptions | undefined) => Fiber.RuntimeFiber<E, A>
```

Added in v2.0.0

## runPromise

Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
with the value of the effect once the effect has been executed, or will be
rejected with the first error or exception throw by the effect.

This method is effectful and should only be used at the edges of your
program.

**Signature**

```ts
export declare const runPromise: <R>(runtime: Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>) => Promise<A>
```

Added in v2.0.0

## runPromiseExit

Runs the `Effect`, returning a JavaScript `Promise` that will be resolved
with the `Exit` state of the effect once the effect has been executed.

This method is effectful and should only be used at the edges of your
program.

**Signature**

```ts
export declare const runPromiseExit: <R>(
  runtime: Runtime<R>,
) => <E, A>(effect: Effect.Effect<R, E, A>) => Promise<Exit.Exit<E, A>>
```

Added in v2.0.0

## runSync

Executes the effect synchronously throwing in case of errors or async boundaries.

This method is effectful and should only be invoked at the edges of your
program.

**Signature**

```ts
export declare const runSync: <R>(runtime: Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>) => A
```

Added in v2.0.0

## runSyncExit

Executes the effect synchronously returning the exit.

This method is effectful and should only be invoked at the edges of your
program.

**Signature**

```ts
export declare const runSyncExit: <R>(runtime: Runtime<R>) => <E, A>(effect: Effect.Effect<R, E, A>) => Exit.Exit<E, A>
```

Added in v2.0.0

# exports

## FiberFailureCauseId (type alias)

**Signature**

```ts
export type FiberFailureCauseId = typeof FiberFailureCauseId
```

Added in v2.0.0

# guards

## isAsyncFiberException

**Signature**

```ts
export declare const isAsyncFiberException: (u: unknown) => u is AsyncFiberException<unknown, unknown>
```

Added in v2.0.0

## isFiberFailure

**Signature**

```ts
export declare const isFiberFailure: (u: unknown) => u is FiberFailure
```

Added in v2.0.0

# models

## AsyncFiberException (interface)

**Signature**

```ts
export interface AsyncFiberException<E, A> {
  readonly _tag: "AsyncFiberException"
  readonly fiber: Fiber.RuntimeFiber<E, A>
}
```

Added in v2.0.0

## Cancel (interface)

**Signature**

```ts
export interface Cancel<E, A> {
  (fiberId?: FiberId.FiberId, onExit?: (exit: Exit.Exit<E, A>) => void): void
}
```

Added in v2.0.0

## FiberFailure (interface)

**Signature**

```ts
export interface FiberFailure extends Error, Inspectable {
  readonly [FiberFailureId]: FiberFailureId
  readonly [FiberFailureCauseId]: Cause<unknown>
}
```

Added in v2.0.0

## RunForkOptions (interface)

**Signature**

```ts
export interface RunForkOptions {
  scheduler?: Scheduler
  updateRefs?: (refs: FiberRefs.FiberRefs, fiberId: FiberId.Runtime) => FiberRefs.FiberRefs
}
```

Added in v2.0.0

## Runtime (interface)

**Signature**

```ts
export interface Runtime<R> extends Pipeable {
  /**
   * The context used as initial for forks
   */
  readonly context: Context.Context<R>
  /**
   * The runtime flags used as initial for forks
   */
  readonly runtimeFlags: RuntimeFlags.RuntimeFlags
  /**
   * The fiber references used as initial for forks
   */
  readonly fiberRefs: FiberRefs.FiberRefs
}
```

Added in v2.0.0

# symbols

## FiberFailureCauseId

**Signature**

```ts
export declare const FiberFailureCauseId: typeof FiberFailureCauseId
```

Added in v2.0.0

## FiberFailureId

**Signature**

```ts
export declare const FiberFailureId: typeof FiberFailureId
```

Added in v2.0.0

## FiberFailureId (type alias)

**Signature**

```ts
export type FiberFailureId = typeof FiberFailureId
```

Added in v2.0.0
