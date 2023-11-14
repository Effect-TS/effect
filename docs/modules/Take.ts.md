---
title: Take.ts
nav_order: 117
parent: Modules
---

## Take overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [chunk](#chunk)
  - [die](#die)
  - [dieMessage](#diemessage)
  - [end](#end)
  - [fail](#fail)
  - [failCause](#failcause)
  - [fromEffect](#fromeffect)
  - [fromExit](#fromexit)
  - [fromPull](#frompull)
  - [make](#make)
  - [of](#of)
- [destructors](#destructors)
  - [done](#done)
  - [match](#match)
  - [matchEffect](#matcheffect)
- [getters](#getters)
  - [isDone](#isdone)
  - [isFailure](#isfailure)
  - [isSuccess](#issuccess)
- [mapping](#mapping)
  - [map](#map)
- [models](#models)
  - [Take (interface)](#take-interface)
- [sequencing](#sequencing)
  - [tap](#tap)
- [symbols](#symbols)
  - [TakeTypeId](#taketypeid)
  - [TakeTypeId (type alias)](#taketypeid-type-alias)
- [utils](#utils)
  - [Take (namespace)](#take-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## chunk

Creates a `Take` with the specified chunk.

**Signature**

```ts
export declare const chunk: <A>(chunk: Chunk.Chunk<A>) => Take<never, A>
```

Added in v2.0.0

## die

Creates a failing `Take` with the specified defect.

**Signature**

```ts
export declare const die: (defect: unknown) => Take<never, never>
```

Added in v2.0.0

## dieMessage

Creates a failing `Take` with the specified error message.

**Signature**

```ts
export declare const dieMessage: (message: string) => Take<never, never>
```

Added in v2.0.0

## end

Represents the end-of-stream marker.

**Signature**

```ts
export declare const end: Take<never, never>
```

Added in v2.0.0

## fail

Creates a failing `Take` with the specified error.

**Signature**

```ts
export declare const fail: <E>(error: E) => Take<E, never>
```

Added in v2.0.0

## failCause

Creates a failing `Take` with the specified cause.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause.Cause<E>) => Take<E, never>
```

Added in v2.0.0

## fromEffect

Creates an effect from `Effect<R, E, A>` that does not fail, but succeeds with
the `Take<E, A>`. Error from stream when pulling is converted to
`Take.failCause`. Creates a single value chunk.

**Signature**

```ts
export declare const fromEffect: <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, never, Take<E, A>>
```

Added in v2.0.0

## fromExit

Creates a `Take` from an `Exit`.

**Signature**

```ts
export declare const fromExit: <E, A>(exit: Exit.Exit<E, A>) => Take<E, A>
```

Added in v2.0.0

## fromPull

Creates effect from `Effect<R, Option<E>, Chunk<A>>` that does not fail, but
succeeds with the `Take<E, A>`. Errors from stream when pulling are converted
to `Take.failCause`, and the end-of-stream is converted to `Take.end`.

**Signature**

```ts
export declare const fromPull: <R, E, A>(
  pull: Effect.Effect<R, Option.Option<E>, Chunk.Chunk<A>>
) => Effect.Effect<R, never, Take<E, A>>
```

Added in v2.0.0

## make

Constructs a `Take`.

**Signature**

```ts
export declare const make: <E, A>(exit: Exit.Exit<Option.Option<E>, Chunk.Chunk<A>>) => Take<E, A>
```

Added in v2.0.0

## of

Creates a `Take` with a single value chunk.

**Signature**

```ts
export declare const of: <A>(value: A) => Take<never, A>
```

Added in v2.0.0

# destructors

## done

Transforms a `Take<E, A>` to an `Effect<never, E, A>`.

**Signature**

```ts
export declare const done: <E, A>(self: Take<E, A>) => Effect.Effect<never, Option.Option<E>, Chunk.Chunk<A>>
```

Added in v2.0.0

## match

Folds over the failure cause, success value and end-of-stream marker to
yield a value.

**Signature**

```ts
export declare const match: {
  <Z, E, Z2, A, Z3>(options: {
    readonly onEnd: () => Z
    readonly onFailure: (cause: Cause.Cause<E>) => Z2
    readonly onSuccess: (chunk: Chunk.Chunk<A>) => Z3
  }): (self: Take<E, A>) => Z | Z2 | Z3
  <Z, E, Z2, A, Z3>(
    self: Take<E, A>,
    options: {
      readonly onEnd: () => Z
      readonly onFailure: (cause: Cause.Cause<E>) => Z2
      readonly onSuccess: (chunk: Chunk.Chunk<A>) => Z3
    }
  ): Z | Z2 | Z3
}
```

Added in v2.0.0

## matchEffect

Effectful version of `Take.fold`.

Folds over the failure cause, success value and end-of-stream marker to
yield an effect.

**Signature**

```ts
export declare const matchEffect: {
  <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(options: {
    readonly onEnd: Effect.Effect<R, E2, Z>
    readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, Z2>
    readonly onSuccess: (chunk: Chunk.Chunk<A>) => Effect.Effect<R3, E3, Z3>
  }): (self: Take<E, A>) => Effect.Effect<R | R2 | R3, E2 | E | E3, Z | Z2 | Z3>
  <R, E2, Z, R2, E, Z2, A, R3, E3, Z3>(
    self: Take<E, A>,
    options: {
      readonly onEnd: Effect.Effect<R, E2, Z>
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R2, E2, Z2>
      readonly onSuccess: (chunk: Chunk.Chunk<A>) => Effect.Effect<R3, E3, Z3>
    }
  ): Effect.Effect<R | R2 | R3, E2 | E | E3, Z | Z2 | Z3>
}
```

Added in v2.0.0

# getters

## isDone

Checks if this `take` is done (`Take.end`).

**Signature**

```ts
export declare const isDone: <E, A>(self: Take<E, A>) => boolean
```

Added in v2.0.0

## isFailure

Checks if this `take` is a failure.

**Signature**

```ts
export declare const isFailure: <E, A>(self: Take<E, A>) => boolean
```

Added in v2.0.0

## isSuccess

Checks if this `take` is a success.

**Signature**

```ts
export declare const isSuccess: <E, A>(self: Take<E, A>) => boolean
```

Added in v2.0.0

# mapping

## map

Transforms `Take<E, A>` to `Take<E, B>` by applying function `f`.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): <E>(self: Take<E, A>) => Take<E, B>
  <E, A, B>(self: Take<E, A>, f: (a: A) => B): Take<E, B>
}
```

Added in v2.0.0

# models

## Take (interface)

A `Take<E, A>` represents a single `take` from a queue modeling a stream of
values. A `Take` may be a failure cause `Cause<E>`, a chunk value `Chunk<A>`,
or an end-of-stream marker.

**Signature**

```ts
export interface Take<E, A> extends Take.Variance<E, A>, Pipeable {
  /** @internal */
  readonly exit: Exit.Exit<Option.Option<E>, Chunk.Chunk<A>>
}
```

Added in v2.0.0

# sequencing

## tap

Returns an effect that effectfully "peeks" at the success of this take.

**Signature**

```ts
export declare const tap: {
  <A, R, E2, _>(
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, E2, _>
  ): <E>(self: Take<E, A>) => Effect.Effect<R, E2 | E, void>
  <E, A, R, E2, _>(
    self: Take<E, A>,
    f: (chunk: Chunk.Chunk<A>) => Effect.Effect<R, E2, _>
  ): Effect.Effect<R, E | E2, void>
}
```

Added in v2.0.0

# symbols

## TakeTypeId

**Signature**

```ts
export declare const TakeTypeId: typeof TakeTypeId
```

Added in v2.0.0

## TakeTypeId (type alias)

**Signature**

```ts
export type TakeTypeId = typeof TakeTypeId
```

Added in v2.0.0

# utils

## Take (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<E, A> {
  readonly [TakeTypeId]: {
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0
