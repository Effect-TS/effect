---
title: Exit.ts
nav_order: 35
parent: Modules
---

## Exit overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [all](#all)
  - [die](#die)
  - [fail](#fail)
  - [failCause](#failcause)
  - [interrupt](#interrupt)
  - [succeed](#succeed)
  - [unit](#unit)
- [conversions](#conversions)
  - [fromEither](#fromeither)
  - [fromOption](#fromoption)
- [elements](#elements)
  - [exists](#exists)
- [folding](#folding)
  - [match](#match)
  - [matchEffect](#matcheffect)
- [getters](#getters)
  - [causeOption](#causeoption)
  - [getOrElse](#getorelse)
  - [isInterrupted](#isinterrupted)
- [mapping](#mapping)
  - [as](#as)
  - [asUnit](#asunit)
  - [map](#map)
  - [mapBoth](#mapboth)
  - [mapError](#maperror)
  - [mapErrorCause](#maperrorcause)
- [models](#models)
  - [Exit (type alias)](#exit-type-alias)
  - [ExitUnify (interface)](#exitunify-interface)
  - [ExitUnifyBlackList (interface)](#exitunifyblacklist-interface)
  - [Failure (interface)](#failure-interface)
  - [Success (interface)](#success-interface)
- [refinements](#refinements)
  - [isExit](#isexit)
  - [isFailure](#isfailure)
  - [isSuccess](#issuccess)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatMapEffect](#flatmapeffect)
  - [flatten](#flatten)
- [traversing](#traversing)
  - [forEachEffect](#foreacheffect)
- [zipping](#zipping)
  - [zip](#zip)
  - [zipLeft](#zipleft)
  - [zipPar](#zippar)
  - [zipParLeft](#zipparleft)
  - [zipParRight](#zipparright)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)

---

# constructors

## all

Collects all of the specified exit values into a `Some<Exit<E, List<A>>>`. If
the provided iterable contains no elements, `None` will be returned.

**Signature**

```ts
export declare const all: <E, A>(
  exits: Iterable<Exit<E, A>>,
  options?: { readonly parallel?: boolean } | undefined
) => Option.Option<Exit<E, A[]>>
```

Added in v2.0.0

## die

Constructs a new `Exit.Failure` from the specified unrecoverable defect.

**Signature**

```ts
export declare const die: (defect: unknown) => Exit<never, never>
```

Added in v2.0.0

## fail

Constructs a new `Exit.Failure` from the specified recoverable error of type
`E`.

**Signature**

```ts
export declare const fail: <E>(error: E) => Exit<E, never>
```

Added in v2.0.0

## failCause

Constructs a new `Exit.Failure` from the specified `Cause` of type `E`.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause.Cause<E>) => Exit<E, never>
```

Added in v2.0.0

## interrupt

Constructs a new `Exit.Failure` from the specified `FiberId` indicating that
the `Fiber` running an `Effect` workflow was terminated due to interruption.

**Signature**

```ts
export declare const interrupt: (fiberId: FiberId.FiberId) => Exit<never, never>
```

Added in v2.0.0

## succeed

Constructs a new `Exit.Success` containing the specified value of type `A`.

**Signature**

```ts
export declare const succeed: <A>(value: A) => Exit<never, A>
```

Added in v2.0.0

## unit

Represents an `Exit` which succeeds with `undefined`.

**Signature**

```ts
export declare const unit: Exit<never, void>
```

Added in v2.0.0

# conversions

## fromEither

Converts an `Either<E, A>` into an `Exit<E, A>`.

**Signature**

```ts
export declare const fromEither: <E, A>(either: Either.Either<E, A>) => Exit<E, A>
```

Added in v2.0.0

## fromOption

Converts an `Option<A>` into an `Exit<void, A>`.

**Signature**

```ts
export declare const fromOption: <A>(option: Option.Option<A>) => Exit<void, A>
```

Added in v2.0.0

# elements

## exists

Executes the predicate on the value of the specified exit if it is a
`Success`, otherwise returns `false`.

**Signature**

```ts
export declare const exists: {
  <A>(predicate: Predicate<A>): <E>(self: Exit<E, A>) => boolean
  <E, A>(self: Exit<E, A>, predicate: Predicate<A>): boolean
}
```

Added in v2.0.0

# folding

## match

**Signature**

```ts
export declare const match: {
  <E, A, Z1, Z2>(options: { readonly onFailure: (cause: Cause.Cause<E>) => Z1; readonly onSuccess: (a: A) => Z2 }): (
    self: Exit<E, A>
  ) => Z1 | Z2
  <E, A, Z1, Z2>(
    self: Exit<E, A>,
    options: { readonly onFailure: (cause: Cause.Cause<E>) => Z1; readonly onSuccess: (a: A) => Z2 }
  ): Z1 | Z2
}
```

Added in v2.0.0

## matchEffect

**Signature**

```ts
export declare const matchEffect: {
  <E, A, R, E2, A2, R2, E3, A3>(options: {
    readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, A2>
    readonly onSuccess: (a: A) => Effect.Effect<R2, E3, A3>
  }): (self: Exit<E, A>) => Effect.Effect<R | R2, E2 | E3, A2 | A3>
  <E, A, R, E2, A2, R2, E3, A3>(
    self: Exit<E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect.Effect<R, E2, A2>
      readonly onSuccess: (a: A) => Effect.Effect<R2, E3, A3>
    }
  ): Effect.Effect<R | R2, E2 | E3, A2 | A3>
}
```

Added in v2.0.0

# getters

## causeOption

Returns a `Some<Cause<E>>` if the specified exit is a `Failure`, `None`
otherwise.

**Signature**

```ts
export declare const causeOption: <E, A>(self: Exit<E, A>) => Option.Option<Cause.Cause<E>>
```

Added in v2.0.0

## getOrElse

Returns the `A` if specified exit is a `Success`, otherwise returns the
alternate `A` value computed from the specified function which receives the
`Cause<E>` of the exit `Failure`.

**Signature**

```ts
export declare const getOrElse: {
  <E, A2>(orElse: (cause: Cause.Cause<E>) => A2): <A1>(self: Exit<E, A1>) => A2 | A1
  <E, A1, A2>(self: Exit<E, A1>, orElse: (cause: Cause.Cause<E>) => A2): A1 | A2
}
```

Added in v2.0.0

## isInterrupted

Returns `true` if the specified exit is a `Failure` **and** the `Cause` of
the failure was due to interruption, `false` otherwise.

**Signature**

```ts
export declare const isInterrupted: <E, A>(self: Exit<E, A>) => boolean
```

Added in v2.0.0

# mapping

## as

Maps the `Success` value of the specified exit to the provided constant
value.

**Signature**

```ts
export declare const as: {
  <A2>(value: A2): <E, A>(self: Exit<E, A>) => Exit<E, A2>
  <E, A, A2>(self: Exit<E, A>, value: A2): Exit<E, A2>
}
```

Added in v2.0.0

## asUnit

Maps the `Success` value of the specified exit to a void.

**Signature**

```ts
export declare const asUnit: <E, A>(self: Exit<E, A>) => Exit<E, void>
```

Added in v2.0.0

## map

Maps over the `Success` value of the specified exit using the provided
function.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): <E>(self: Exit<E, A>) => Exit<E, B>
  <E, A, B>(self: Exit<E, A>, f: (a: A) => B): Exit<E, B>
}
```

Added in v2.0.0

## mapBoth

Maps over the `Success` and `Failure` cases of the specified exit using the
provided functions.

**Signature**

```ts
export declare const mapBoth: {
  <E, A, E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): (
    self: Exit<E, A>
  ) => Exit<E2, A2>
  <E, A, E2, A2>(
    self: Exit<E, A>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Exit<E2, A2>
}
```

Added in v2.0.0

## mapError

Maps over the error contained in the `Failure` of the specified exit using
the provided function.

**Signature**

```ts
export declare const mapError: {
  <E, E2>(f: (e: E) => E2): <A>(self: Exit<E, A>) => Exit<E2, A>
  <E, A, E2>(self: Exit<E, A>, f: (e: E) => E2): Exit<E2, A>
}
```

Added in v2.0.0

## mapErrorCause

Maps over the `Cause` contained in the `Failure` of the specified exit using
the provided function.

**Signature**

```ts
export declare const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <A>(self: Exit<E, A>) => Exit<E2, A>
  <E, A, E2>(self: Exit<E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Exit<E2, A>
}
```

Added in v2.0.0

# models

## Exit (type alias)

An `Exit<E, A>` describes the result of a executing an `Effect` workflow.

There are two possible values for an `Exit<E, A>`:

- `Exit.Success` contain a success value of type `A`
- `Exit.Failure` contains a failure `Cause` of type `E`

**Signature**

```ts
export type Exit<E, A> = Failure<E, A> | Success<E, A>
```

Added in v2.0.0

## ExitUnify (interface)

**Signature**

```ts
export interface ExitUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  Exit?: () => A[Unify.typeSymbol] extends Exit<infer E0, infer A0> | infer _ ? Exit<E0, A0> : never
}
```

Added in v2.0.0

## ExitUnifyBlackList (interface)

**Signature**

```ts
export interface ExitUnifyBlackList extends Effect.EffectUnifyBlacklist {
  Effect?: true
}
```

Added in v2.0.0

## Failure (interface)

Represents a failed `Effect` workflow containing the `Cause` of the failure
of type `E`.

**Signature**

```ts
export interface Failure<E, A> extends Effect.Effect<never, E, A>, Pipeable, Inspectable {
  readonly _tag: 'Failure'
  readonly _op: 'Failure'
  readonly cause: Cause.Cause<E>
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: ExitUnify<this>
  [Unify.blacklistSymbol]?: ExitUnifyBlackList
  /** @internal */
  readonly i0: Cause.Cause<E>
}
```

Added in v2.0.0

## Success (interface)

Represents a successful `Effect` workflow and containing the returned value
of type `A`.

**Signature**

```ts
export interface Success<E, A> extends Effect.Effect<never, E, A>, Pipeable, Inspectable {
  readonly _tag: 'Success'
  readonly _op: 'Success'
  readonly value: A
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: ExitUnify<this>
  [Unify.blacklistSymbol]?: ExitUnifyBlackList
  /** @internal */
  readonly i0: A
}
```

Added in v2.0.0

# refinements

## isExit

Returns `true` if the specified value is an `Exit`, `false` otherwise.

**Signature**

```ts
export declare const isExit: (u: unknown) => u is Exit<unknown, unknown>
```

Added in v2.0.0

## isFailure

Returns `true` if the specified `Exit` is a `Failure`, `false` otherwise.

**Signature**

```ts
export declare const isFailure: <E, A>(self: Exit<E, A>) => self is Failure<E, A>
```

Added in v2.0.0

## isSuccess

Returns `true` if the specified `Exit` is a `Success`, `false` otherwise.

**Signature**

```ts
export declare const isSuccess: <E, A>(self: Exit<E, A>) => self is Success<E, A>
```

Added in v2.0.0

# sequencing

## flatMap

**Signature**

```ts
export declare const flatMap: {
  <A, E2, A2>(f: (a: A) => Exit<E2, A2>): <E>(self: Exit<E, A>) => Exit<E2 | E, A2>
  <E, A, E2, A2>(self: Exit<E, A>, f: (a: A) => Exit<E2, A2>): Exit<E | E2, A2>
}
```

Added in v2.0.0

## flatMapEffect

**Signature**

```ts
export declare const flatMapEffect: {
  <E, A, R, E2, A2>(f: (a: A) => Effect.Effect<R, E2, Exit<E, A2>>): (
    self: Exit<E, A>
  ) => Effect.Effect<R, E2, Exit<E, A2>>
  <E, A, R, E2, A2>(self: Exit<E, A>, f: (a: A) => Effect.Effect<R, E2, Exit<E, A2>>): Effect.Effect<R, E2, Exit<E, A2>>
}
```

Added in v2.0.0

## flatten

**Signature**

```ts
export declare const flatten: <E, E1, A>(self: Exit<E, Exit<E1, A>>) => Exit<E | E1, A>
```

Added in v2.0.0

# traversing

## forEachEffect

**Signature**

```ts
export declare const forEachEffect: {
  <A, R, E2, B>(f: (a: A) => Effect.Effect<R, E2, B>): <E>(self: Exit<E, A>) => Effect.Effect<R, never, Exit<E2 | E, B>>
  <E, A, R, E2, B>(self: Exit<E, A>, f: (a: A) => Effect.Effect<R, E2, B>): Effect.Effect<R, never, Exit<E | E2, B>>
}
```

Added in v2.0.0

# zipping

## zip

Sequentially zips the this result with the specified result or else returns
the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zip: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, readonly [A, A2]>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, readonly [A, A2]>
}
```

Added in v2.0.0

## zipLeft

Sequentially zips the this result with the specified result discarding the
second element of the tuple or else returns the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipLeft: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, A>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, A>
}
```

Added in v2.0.0

## zipPar

Parallelly zips the this result with the specified result or else returns
the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipPar: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, readonly [A, A2]>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, readonly [A, A2]>
}
```

Added in v2.0.0

## zipParLeft

Parallelly zips the this result with the specified result discarding the
second element of the tuple or else returns the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipParLeft: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, A>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, A>
}
```

Added in v2.0.0

## zipParRight

Parallelly zips the this result with the specified result discarding the
first element of the tuple or else returns the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipParRight: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, A2>
}
```

Added in v2.0.0

## zipRight

Sequentially zips the this result with the specified result discarding the
first element of the tuple or else returns the failed `Cause<E | E2>`.

**Signature**

```ts
export declare const zipRight: {
  <E2, A2>(that: Exit<E2, A2>): <E, A>(self: Exit<E, A>) => Exit<E2 | E, A2>
  <E, A, E2, A2>(self: Exit<E, A>, that: Exit<E2, A2>): Exit<E | E2, A2>
}
```

Added in v2.0.0

## zipWith

Zips this exit together with that exit using the specified combination
functions.

**Signature**

```ts
export declare const zipWith: {
  <E, E2, A, B, C>(
    that: Exit<E2, B>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ): (self: Exit<E, A>) => Exit<E | E2, C>
  <E, E2, A, B, C>(
    self: Exit<E, A>,
    that: Exit<E2, B>,
    options: {
      readonly onSuccess: (a: A, b: B) => C
      readonly onFailure: (cause: Cause.Cause<E>, cause2: Cause.Cause<E2>) => Cause.Cause<E | E2>
    }
  ): Exit<E | E2, C>
}
```

Added in v2.0.0
