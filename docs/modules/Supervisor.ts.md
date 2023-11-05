---
title: Supervisor.ts
nav_order: 114
parent: Modules
---

## Supervisor overview

A `Supervisor<T>` is allowed to supervise the launching and termination of
fibers, producing some visible value of type `T` from the supervision.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [AbstractSupervisor (class)](#abstractsupervisor-class)
    - [value (method)](#value-method)
    - [onStart (method)](#onstart-method)
    - [onEnd (method)](#onend-method)
    - [onEffect (method)](#oneffect-method)
    - [onSuspend (method)](#onsuspend-method)
    - [onResume (method)](#onresume-method)
    - [map (method)](#map-method)
    - [zip (method)](#zip-method)
    - [onRun (method)](#onrun-method)
    - [[SupervisorTypeId] (property)](#supervisortypeid-property)
  - [fibersIn](#fibersin)
  - [fromEffect](#fromeffect)
  - [none](#none)
  - [track](#track)
- [context](#context)
  - [addSupervisor](#addsupervisor)
- [models](#models)
  - [Supervisor (interface)](#supervisor-interface)
- [symbols](#symbols)
  - [SupervisorTypeId](#supervisortypeid)
  - [SupervisorTypeId (type alias)](#supervisortypeid-type-alias)
- [unsafe](#unsafe)
  - [unsafeTrack](#unsafetrack)
- [utils](#utils)
  - [Supervisor (namespace)](#supervisor-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## AbstractSupervisor (class)

**Signature**

```ts
export declare class AbstractSupervisor<T>
```

Added in v2.0.0

### value (method)

**Signature**

```ts
abstract value(): Effect<never, never, T>
```

Added in v2.0.0

### onStart (method)

**Signature**

```ts
onStart<R, E, A>(
    _context: Context<R>,
    _effect: Effect<R, E, A>,
    _parent: Option<Fiber.RuntimeFiber<any, any>>,
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void
```

Added in v2.0.0

### onEnd (method)

**Signature**

```ts
onEnd<E, A>(
    _value: Exit<E, A>,
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void
```

Added in v2.0.0

### onEffect (method)

**Signature**

```ts
onEffect<E, A>(
    _fiber: Fiber.RuntimeFiber<E, A>,
    _effect: Effect<any, any, any>
  ): void
```

Added in v2.0.0

### onSuspend (method)

**Signature**

```ts
onSuspend<E, A>(
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void
```

Added in v2.0.0

### onResume (method)

**Signature**

```ts
onResume<E, A>(
    _fiber: Fiber.RuntimeFiber<E, A>
  ): void
```

Added in v2.0.0

### map (method)

**Signature**

```ts
map<B>(f: (a: T) => B): Supervisor<B>
```

Added in v2.0.0

### zip (method)

**Signature**

```ts
zip<A>(
    right: Supervisor<A>
  ): Supervisor<[T, A]>
```

Added in v2.0.0

### onRun (method)

**Signature**

```ts
onRun<E, A, X>(execution: () => X, _fiber: Fiber.RuntimeFiber<E, A>): X
```

Added in v2.0.0

### [SupervisorTypeId] (property)

**Signature**

```ts
readonly [SupervisorTypeId]: { _T: (_: never) => never; }
```

Added in v2.0.0

## fibersIn

Creates a new supervisor that tracks children in a set.

**Signature**

```ts
export declare const fibersIn: (
  ref: MutableRef<SortedSet<Fiber.RuntimeFiber<any, any>>>
) => Effect<never, never, Supervisor<SortedSet<Fiber.RuntimeFiber<any, any>>>>
```

Added in v2.0.0

## fromEffect

Creates a new supervisor that constantly yields effect when polled

**Signature**

```ts
export declare const fromEffect: <A>(effect: Effect<never, never, A>) => Supervisor<A>
```

Added in v2.0.0

## none

A supervisor that doesn't do anything in response to supervision events.

**Signature**

```ts
export declare const none: Supervisor<void>
```

Added in v2.0.0

## track

Creates a new supervisor that tracks children in a set.

**Signature**

```ts
export declare const track: Effect<never, never, Supervisor<Fiber.RuntimeFiber<any, any>[]>>
```

Added in v2.0.0

# context

## addSupervisor

**Signature**

```ts
export declare const addSupervisor: <A>(supervisor: Supervisor<A>) => Layer<never, never, never>
```

Added in v2.0.0

# models

## Supervisor (interface)

**Signature**

```ts
export interface Supervisor<T> extends Supervisor.Variance<T> {
  /**
   * Returns an `Effect` that succeeds with the value produced by this
   * supervisor. This value may change over time, reflecting what the supervisor
   * produces as it supervises fibers.
   */
  value(): Effect<never, never, T>

  /**
   * Supervises the start of a `Fiber`.
   */
  onStart<R, E, A>(
    context: Context<R>,
    effect: Effect<R, E, A>,
    parent: Option<Fiber.RuntimeFiber<any, any>>,
    fiber: Fiber.RuntimeFiber<E, A>
  ): void

  /**
   * Supervises the end of a `Fiber`.
   */
  onEnd<E, A>(value: Exit<E, A>, fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Supervises the execution of an `Effect` by a `Fiber`.
   */
  onEffect<E, A>(fiber: Fiber.RuntimeFiber<E, A>, effect: Effect<any, any, any>): void

  /**
   * Supervises the suspension of a computation running within a `Fiber`.
   */
  onSuspend<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Supervises the resumption of a computation running within a `Fiber`.
   */
  onResume<E, A>(fiber: Fiber.RuntimeFiber<E, A>): void

  /**
   * Maps this supervisor to another one, which has the same effect, but whose
   * value has been transformed by the specified function.
   */
  map<B>(f: (a: T) => B): Supervisor<B>

  /**
   * Returns a new supervisor that performs the function of this supervisor, and
   * the function of the specified supervisor, producing a tuple of the outputs
   * produced by both supervisors.
   */
  zip<A>(right: Supervisor<A>): Supervisor<[T, A]>
}
```

Added in v2.0.0

# symbols

## SupervisorTypeId

**Signature**

```ts
export declare const SupervisorTypeId: typeof SupervisorTypeId
```

Added in v2.0.0

## SupervisorTypeId (type alias)

**Signature**

```ts
export type SupervisorTypeId = typeof SupervisorTypeId
```

Added in v2.0.0

# unsafe

## unsafeTrack

Unsafely creates a new supervisor that tracks children in a set.

**Signature**

```ts
export declare const unsafeTrack: () => Supervisor<Array<Fiber.RuntimeFiber<any, any>>>
```

Added in v2.0.0

# utils

## Supervisor (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<T> {
  readonly [SupervisorTypeId]: {
    readonly _T: (_: never) => T
  }
}
```

Added in v2.0.0
