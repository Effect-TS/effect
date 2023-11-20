---
title: Cause.ts
nav_order: 6
parent: Modules
---

## Cause overview

The `Effect<R, E, A>` type is polymorphic in values of type `E` and we can
work with any error type that we want. However, there is a lot of information
that is not inside an arbitrary `E` value. So as a result, an `Effect` needs
somewhere to store things like unexpected errors or defects, stack and
execution traces, causes of fiber interruptions, and so forth.

Effect-TS is very strict about preserving the full information related to a
failure. It captures all type of errors into the `Cause` data type. `Effect`
uses the `Cause<E>` data type to store the full story of failure. So its
error model is lossless. It doesn't throw information related to the failure
result. So we can figure out exactly what happened during the operation of
our effects.

It is important to note that `Cause` is an underlying data type representing
errors occuring within an `Effect` workflow. Thus, we don't usually deal with
`Cause`s directly. Even though it is not a data type that we deal with very
often, the `Cause` of a failing `Effect` workflow can be accessed at any
time, which gives us total access to all parallel and sequential errors in
occurring within our codebase.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [die](#die)
  - [empty](#empty)
  - [fail](#fail)
  - [interrupt](#interrupt)
  - [parallel](#parallel)
  - [sequential](#sequential)
- [destructors](#destructors)
  - [squash](#squash)
  - [squashWith](#squashwith)
- [elements](#elements)
  - [contains](#contains)
  - [find](#find)
- [errors](#errors)
  - [IllegalArgumentException](#illegalargumentexception)
  - [InterruptedException](#interruptedexception)
  - [NoSuchElementException](#nosuchelementexception)
  - [RuntimeException](#runtimeexception)
  - [YieldableError](#yieldableerror)
  - [originalError](#originalerror)
- [filtering](#filtering)
  - [filter](#filter)
- [folding](#folding)
  - [match](#match)
  - [reduce](#reduce)
  - [reduceWithContext](#reducewithcontext)
- [getters](#getters)
  - [defects](#defects)
  - [dieOption](#dieoption)
  - [failureOption](#failureoption)
  - [failureOrCause](#failureorcause)
  - [failures](#failures)
  - [flipCauseOption](#flipcauseoption)
  - [interruptOption](#interruptoption)
  - [interruptors](#interruptors)
  - [isDie](#isdie)
  - [isEmpty](#isempty)
  - [isFailure](#isfailure)
  - [isInterrupted](#isinterrupted)
  - [isInterruptedOnly](#isinterruptedonly)
  - [keepDefects](#keepdefects)
  - [linearize](#linearize)
  - [size](#size)
  - [stripFailures](#stripfailures)
  - [stripSomeDefects](#stripsomedefects)
- [mapping](#mapping)
  - [as](#as)
  - [map](#map)
- [models](#models)
  - [Cause (type alias)](#cause-type-alias)
  - [CauseReducer (interface)](#causereducer-interface)
  - [Die (interface)](#die-interface)
  - [Empty (interface)](#empty-interface)
  - [Fail (interface)](#fail-interface)
  - [IllegalArgumentException (interface)](#illegalargumentexception-interface)
  - [Interrupt (interface)](#interrupt-interface)
  - [InterruptedException (interface)](#interruptedexception-interface)
  - [InvalidPubSubCapacityException (interface)](#invalidpubsubcapacityexception-interface)
  - [NoSuchElementException (interface)](#nosuchelementexception-interface)
  - [Parallel (interface)](#parallel-interface)
  - [RuntimeException (interface)](#runtimeexception-interface)
  - [Sequential (interface)](#sequential-interface)
  - [YieldableError (interface)](#yieldableerror-interface)
- [refinements](#refinements)
  - [isCause](#iscause)
  - [isDieType](#isdietype)
  - [isEmptyType](#isemptytype)
  - [isFailType](#isfailtype)
  - [isIllegalArgumentException](#isillegalargumentexception)
  - [isInterruptType](#isinterrupttype)
  - [isInterruptedException](#isinterruptedexception)
  - [isNoSuchElementException](#isnosuchelementexception)
  - [isParallelType](#isparalleltype)
  - [isRuntimeException](#isruntimeexception)
  - [isSequentialType](#issequentialtype)
- [rendering](#rendering)
  - [pretty](#pretty)
- [sequencing](#sequencing)
  - [andThen](#andthen)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
- [symbols](#symbols)
  - [CauseTypeId](#causetypeid)
  - [CauseTypeId (type alias)](#causetypeid-type-alias)
  - [IllegalArgumentExceptionTypeId](#illegalargumentexceptiontypeid)
  - [IllegalArgumentExceptionTypeId (type alias)](#illegalargumentexceptiontypeid-type-alias)
  - [InterruptedExceptionTypeId](#interruptedexceptiontypeid)
  - [InterruptedExceptionTypeId (type alias)](#interruptedexceptiontypeid-type-alias)
  - [InvalidPubSubCapacityExceptionTypeId](#invalidpubsubcapacityexceptiontypeid)
  - [InvalidPubSubCapacityExceptionTypeId (type alias)](#invalidpubsubcapacityexceptiontypeid-type-alias)
  - [NoSuchElementExceptionTypeId](#nosuchelementexceptiontypeid)
  - [NoSuchElementExceptionTypeId (type alias)](#nosuchelementexceptiontypeid-type-alias)
  - [RuntimeExceptionTypeId](#runtimeexceptiontypeid)
  - [RuntimeExceptionTypeId (type alias)](#runtimeexceptiontypeid-type-alias)
- [utils](#utils)
  - [Cause (namespace)](#cause-namespace)
    - [Variance (interface)](#variance-interface)

---

# constructors

## die

Constructs a new `Die` cause from the specified `defect`.

**Signature**

```ts
export declare const die: (defect: unknown) => Cause<never>
```

Added in v2.0.0

## empty

Constructs a new `Empty` cause.

**Signature**

```ts
export declare const empty: Cause<never>
```

Added in v2.0.0

## fail

Constructs a new `Fail` cause from the specified `error`.

**Signature**

```ts
export declare const fail: <E>(error: E) => Cause<E>
```

Added in v2.0.0

## interrupt

Constructs a new `Interrupt` cause from the specified `fiberId`.

**Signature**

```ts
export declare const interrupt: (fiberId: FiberId.FiberId) => Cause<never>
```

Added in v2.0.0

## parallel

Constructs a new `Parallel` cause from the specified `left` and `right`
causes.

**Signature**

```ts
export declare const parallel: <E, E2>(left: Cause<E>, right: Cause<E2>) => Cause<E | E2>
```

Added in v2.0.0

## sequential

Constructs a new `Sequential` cause from the specified pecified `left` and
`right` causes.

**Signature**

```ts
export declare const sequential: <E, E2>(left: Cause<E>, right: Cause<E2>) => Cause<E | E2>
```

Added in v2.0.0

# destructors

## squash

Squashes a `Cause` down to a single defect, chosen to be the "most important"
defect.

**Signature**

```ts
export declare const squash: <E>(self: Cause<E>) => unknown
```

Added in v2.0.0

## squashWith

Squashes a `Cause` down to a single defect, chosen to be the "most important"
defect. If a recoverable error is found, the provided function will be used
to map the error a defect, and the resulting value will be returned.

**Signature**

```ts
export declare const squashWith: {
  <E>(f: (error: E) => unknown): (self: Cause<E>) => unknown
  <E>(self: Cause<E>, f: (error: E) => unknown): unknown
}
```

Added in v2.0.0

# elements

## contains

Returns `true` if the `self` cause contains or is equal to `that` cause,
`false` otherwise.

**Signature**

```ts
export declare const contains: {
  <E2>(that: Cause<E2>): <E>(self: Cause<E>) => boolean
  <E, E2>(self: Cause<E>, that: Cause<E2>): boolean
}
```

Added in v2.0.0

## find

Uses the provided partial function to search the specified cause and attempt
to extract information from it.

**Signature**

```ts
export declare const find: {
  <E, Z>(pf: (cause: Cause<E>) => Option.Option<Z>): (self: Cause<E>) => Option.Option<Z>
  <E, Z>(self: Cause<E>, pf: (cause: Cause<E>) => Option.Option<Z>): Option.Option<Z>
}
```

Added in v2.0.0

# errors

## IllegalArgumentException

Represents a checked exception which occurs when an invalid argument is
provided to a method.

**Signature**

```ts
export declare const IllegalArgumentException: (message?: string) => IllegalArgumentException
```

Added in v2.0.0

## InterruptedException

Represents a checked exception which occurs when a `Fiber` is interrupted.

**Signature**

```ts
export declare const InterruptedException: (message?: string) => InterruptedException
```

Added in v2.0.0

## NoSuchElementException

Represents a checked exception which occurs when an expected element was
unable to be found.

**Signature**

```ts
export declare const NoSuchElementException: (message?: string) => NoSuchElementException
```

Added in v2.0.0

## RuntimeException

Represents a generic checked exception which occurs at runtime.

**Signature**

```ts
export declare const RuntimeException: (message?: string) => RuntimeException
```

Added in v2.0.0

## YieldableError

Represents a generic checked exception which occurs at runtime.

**Signature**

```ts
export declare const YieldableError: new (message?: string | undefined) => YieldableError
```

Added in v2.0.0

## originalError

Returns the original, unproxied, instance of a thrown error

**Signature**

```ts
export declare const originalError: <E>(obj: E) => E
```

Added in v2.0.0

# filtering

## filter

Filters causes which match the provided predicate out of the specified cause.

**Signature**

```ts
export declare const filter: {
  <E>(predicate: Predicate<Cause<E>>): (self: Cause<E>) => Cause<E>
  <E>(self: Cause<E>, predicate: Predicate<Cause<E>>): Cause<E>
}
```

Added in v2.0.0

# folding

## match

Folds the specified cause into a value of type `Z`.

**Signature**

```ts
export declare const match: {
  <Z, E>(options: {
    readonly onEmpty: Z
    readonly onFail: (error: E) => Z
    readonly onDie: (defect: unknown) => Z
    readonly onInterrupt: (fiberId: FiberId.FiberId) => Z
    readonly onSequential: (left: Z, right: Z) => Z
    readonly onParallel: (left: Z, right: Z) => Z
  }): (self: Cause<E>) => Z
  <Z, E>(
    self: Cause<E>,
    options: {
      readonly onEmpty: Z
      readonly onFail: (error: E) => Z
      readonly onDie: (defect: unknown) => Z
      readonly onInterrupt: (fiberId: FiberId.FiberId) => Z
      readonly onSequential: (left: Z, right: Z) => Z
      readonly onParallel: (left: Z, right: Z) => Z
    }
  ): Z
}
```

Added in v2.0.0

## reduce

Reduces the specified cause into a value of type `Z`, beginning with the
provided `zero` value.

**Signature**

```ts
export declare const reduce: {
  <Z, E>(zero: Z, pf: (accumulator: Z, cause: Cause<E>) => Option.Option<Z>): (self: Cause<E>) => Z
  <Z, E>(self: Cause<E>, zero: Z, pf: (accumulator: Z, cause: Cause<E>) => Option.Option<Z>): Z
}
```

Added in v2.0.0

## reduceWithContext

Reduces the specified cause into a value of type `Z` using a `Cause.Reducer`.
Also allows for accessing the provided context during reduction.

**Signature**

```ts
export declare const reduceWithContext: {
  <C, E, Z>(context: C, reducer: CauseReducer<C, E, Z>): (self: Cause<E>) => Z
  <C, E, Z>(self: Cause<E>, context: C, reducer: CauseReducer<C, E, Z>): Z
}
```

Added in v2.0.0

# getters

## defects

Returns a `List` of all unrecoverable defects in the specified cause.

**Signature**

```ts
export declare const defects: <E>(self: Cause<E>) => Chunk.Chunk<unknown>
```

Added in v2.0.0

## dieOption

Returns the defect associated with the first `Die` in this `Cause`, if one
exists.

**Signature**

```ts
export declare const dieOption: <E>(self: Cause<E>) => Option.Option<unknown>
```

Added in v2.0.0

## failureOption

Returns the `E` associated with the first `Fail` in this `Cause`, if one
exists.

**Signature**

```ts
export declare const failureOption: <E>(self: Cause<E>) => Option.Option<E>
```

Added in v2.0.0

## failureOrCause

Returns the first checked error on the `Left` if available, if there are
no checked errors return the rest of the `Cause` that is known to contain
only `Die` or `Interrupt` causes.

**Signature**

```ts
export declare const failureOrCause: <E>(self: Cause<E>) => Either.Either<E, Cause<never>>
```

Added in v2.0.0

## failures

Returns a `List` of all recoverable errors of type `E` in the specified
cause.

**Signature**

```ts
export declare const failures: <E>(self: Cause<E>) => Chunk.Chunk<E>
```

Added in v2.0.0

## flipCauseOption

Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>` by
recursively stripping out any failures with the error `None`.

**Signature**

```ts
export declare const flipCauseOption: <E>(self: Cause<Option.Option<E>>) => Option.Option<Cause<E>>
```

Added in v2.0.0

## interruptOption

Returns the `FiberId` associated with the first `Interrupt` in the specified
cause, if one exists.

**Signature**

```ts
export declare const interruptOption: <E>(self: Cause<E>) => Option.Option<FiberId.FiberId>
```

Added in v2.0.0

## interruptors

Returns a `HashSet` of `FiberId`s for all fibers that interrupted the fiber
described by the specified cause.

**Signature**

```ts
export declare const interruptors: <E>(self: Cause<E>) => HashSet.HashSet<FiberId.FiberId>
```

Added in v2.0.0

## isDie

Returns `true` if the specified cause contains a defect, `false` otherwise.

**Signature**

```ts
export declare const isDie: <E>(self: Cause<E>) => boolean
```

Added in v2.0.0

## isEmpty

Returns `true` if the specified cause is empty, `false` otherwise.

**Signature**

```ts
export declare const isEmpty: <E>(self: Cause<E>) => boolean
```

Added in v2.0.0

## isFailure

Returns `true` if the specified cause contains a failure, `false` otherwise.

**Signature**

```ts
export declare const isFailure: <E>(self: Cause<E>) => boolean
```

Added in v2.0.0

## isInterrupted

Returns `true` if the specified cause contains an interruption, `false`
otherwise.

**Signature**

```ts
export declare const isInterrupted: <E>(self: Cause<E>) => boolean
```

Added in v2.0.0

## isInterruptedOnly

Returns `true` if the specified cause contains only interruptions (without
any `Die` or `Fail` causes), `false` otherwise.

**Signature**

```ts
export declare const isInterruptedOnly: <E>(self: Cause<E>) => boolean
```

Added in v2.0.0

## keepDefects

Remove all `Fail` and `Interrupt` nodes from the specified cause, and return
a cause containing only `Die` cause/finalizer defects.

**Signature**

```ts
export declare const keepDefects: <E>(self: Cause<E>) => Option.Option<Cause<never>>
```

Added in v2.0.0

## linearize

Linearizes the specified cause into a `HashSet` of parallel causes where each
parallel cause contains a linear sequence of failures.

**Signature**

```ts
export declare const linearize: <E>(self: Cause<E>) => HashSet.HashSet<Cause<E>>
```

Added in v2.0.0

## size

Returns the size of the cause, calculated as the number of individual `Cause`
nodes found in the `Cause` semiring structure.

**Signature**

```ts
export declare const size: <E>(self: Cause<E>) => number
```

Added in v2.0.0

## stripFailures

Remove all `Fail` and `Interrupt` nodes from the specified cause, and return
a cause containing only `Die` cause/finalizer defects.

**Signature**

```ts
export declare const stripFailures: <E>(self: Cause<E>) => Cause<never>
```

Added in v2.0.0

## stripSomeDefects

Remove all `Die` causes that the specified partial function is defined at,
returning `Some` with the remaining causes or `None` if there are no
remaining causes.

**Signature**

```ts
export declare const stripSomeDefects: {
  (pf: (defect: unknown) => Option.Option<unknown>): <E>(self: Cause<E>) => Option.Option<Cause<E>>
  <E>(self: Cause<E>, pf: (defect: unknown) => Option.Option<unknown>): Option.Option<Cause<E>>
}
```

Added in v2.0.0

# mapping

## as

**Signature**

```ts
export declare const as: {
  <E2>(error: E2): <E>(self: Cause<E>) => Cause<E2>
  <E, E2>(self: Cause<E>, error: E2): Cause<E2>
}
```

Added in v2.0.0

## map

**Signature**

```ts
export declare const map: {
  <E, E2>(f: (e: E) => E2): (self: Cause<E>) => Cause<E2>
  <E, E2>(self: Cause<E>, f: (e: E) => E2): Cause<E2>
}
```

Added in v2.0.0

# models

## Cause (type alias)

A `Cause` represents the full history of a failure resulting from running an
`Effect` workflow.

Effect-TS uses a data structure from functional programming called a semiring
to represent the `Cause` data type. This allows us to take a base type `E`
(which represents the error type of an `Effect`) and capture the sequential
and parallel composition of errors in a fully lossless fashion.

**Signature**

```ts
export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Sequential<E> | Parallel<E>
```

Added in v2.0.0

## CauseReducer (interface)

Represents a set of methods that can be used to reduce a `Cause<E>` to a
specified value of type `Z` with access to a context of type `C`.

**Signature**

```ts
export interface CauseReducer<in C, in E, in out Z> {
  emptyCase(context: C): Z
  failCase(context: C, error: E): Z
  dieCase(context: C, defect: unknown): Z
  interruptCase(context: C, fiberId: FiberId.FiberId): Z
  sequentialCase(context: C, left: Z, right: Z): Z
  parallelCase(context: C, left: Z, right: Z): Z
}
```

Added in v2.0.0

## Die (interface)

The `Die` cause represents a `Cause` which failed as a result of a defect, or
in other words, an unexpected error.

type `E`.

**Signature**

```ts
export interface Die extends Cause.Variance<never>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Die"
  readonly defect: unknown
}
```

Added in v2.0.0

## Empty (interface)

The `Empty` cause represents a lack of errors.

**Signature**

```ts
export interface Empty extends Cause.Variance<never>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Empty"
}
```

Added in v2.0.0

## Fail (interface)

The `Fail` cause represents a `Cause` which failed with an expected error of
type `E`.

**Signature**

```ts
export interface Fail<out E> extends Cause.Variance<E>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Fail"
  readonly error: E
}
```

Added in v2.0.0

## IllegalArgumentException (interface)

Represents a checked exception which occurs when an invalid argument is
provided to a method.

**Signature**

```ts
export interface IllegalArgumentException extends YieldableError {
  readonly _tag: "IllegalArgumentException"
  readonly [IllegalArgumentExceptionTypeId]: IllegalArgumentExceptionTypeId
}
```

Added in v2.0.0

## Interrupt (interface)

The `Interrupt` cause represents failure due to `Fiber` interruption, which
contains the `FiberId` of the interrupted `Fiber`.

**Signature**

```ts
export interface Interrupt extends Cause.Variance<never>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Interrupt"
  readonly fiberId: FiberId.FiberId
}
```

Added in v2.0.0

## InterruptedException (interface)

Represents a checked exception which occurs when a `Fiber` is interrupted.

**Signature**

```ts
export interface InterruptedException extends YieldableError {
  readonly _tag: "InterruptedException"
  readonly [InterruptedExceptionTypeId]: InterruptedExceptionTypeId
}
```

Added in v2.0.0

## InvalidPubSubCapacityException (interface)

Represents a checked exception which occurs when attempting to construct a
`PubSub` with an invalid capacity.

**Signature**

```ts
export interface InvalidPubSubCapacityException extends YieldableError {
  readonly _tag: "InvalidPubSubCapacityException"
  readonly [InvalidPubSubCapacityExceptionTypeId]: InvalidPubSubCapacityExceptionTypeId
}
```

Added in v2.0.0

## NoSuchElementException (interface)

Represents a checked exception which occurs when an expected element was
unable to be found.

**Signature**

```ts
export interface NoSuchElementException extends YieldableError {
  readonly _tag: "NoSuchElementException"
  readonly [NoSuchElementExceptionTypeId]: NoSuchElementExceptionTypeId
}
```

Added in v2.0.0

## Parallel (interface)

The `Parallel` cause represents the composition of two causes which occurred
in parallel.

In Effect-TS programs, it is possible that two operations may be performed in
parallel. In these cases, the `Effect` workflow can fail for more than one
reason. If both computations fail, then there are actually two errors which
occurred in parallel. In these cases, the errors can be represented by the
`Parallel` cause.

**Signature**

```ts
export interface Parallel<out E> extends Cause.Variance<E>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Parallel"
  readonly left: Cause<E>
  readonly right: Cause<E>
}
```

Added in v2.0.0

## RuntimeException (interface)

Represents a generic checked exception which occurs at runtime.

**Signature**

```ts
export interface RuntimeException extends YieldableError {
  readonly _tag: "RuntimeException"
  readonly [RuntimeExceptionTypeId]: RuntimeExceptionTypeId
}
```

Added in v2.0.0

## Sequential (interface)

The `Sequential` cause represents the composition of two causes which occurred
sequentially.

For example, if we perform Effect-TS's analog of `try-finally` (i.e.
`Effect.ensuring`), and both the `try` and `finally` blocks fail, we have two
errors which occurred sequentially. In these cases, the errors can be
represented by the `Sequential` cause.

**Signature**

```ts
export interface Sequential<out E> extends Cause.Variance<E>, Equal.Equal, Pipeable, Inspectable {
  readonly _tag: "Sequential"
  readonly left: Cause<E>
  readonly right: Cause<E>
}
```

Added in v2.0.0

## YieldableError (interface)

**Signature**

```ts
export interface YieldableError extends Data.Case, Pipeable, Readonly<Error> {
  readonly [Effect.EffectTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Stream.StreamTypeId]: Effect.Effect.VarianceStruct<never, this, never>
  readonly [Sink.SinkTypeId]: Sink.Sink.VarianceStruct<never, this, unknown, never, never>
  readonly [Channel.ChannelTypeId]: Channel.Channel.VarianceStruct<never, unknown, unknown, unknown, this, never, never>
}
```

Added in v2.0.0

# refinements

## isCause

Returns `true` if the specified value is a `Cause`, `false` otherwise.

**Signature**

```ts
export declare const isCause: (u: unknown) => u is Cause<never>
```

Added in v2.0.0

## isDieType

Returns `true` if the specified `Cause` is a `Die` type, `false`
otherwise.

**Signature**

```ts
export declare const isDieType: <E>(self: Cause<E>) => self is Die
```

Added in v2.0.0

## isEmptyType

Returns `true` if the specified `Cause` is an `Empty` type, `false`
otherwise.

**Signature**

```ts
export declare const isEmptyType: <E>(self: Cause<E>) => self is Empty
```

Added in v2.0.0

## isFailType

Returns `true` if the specified `Cause` is a `Fail` type, `false`
otherwise.

**Signature**

```ts
export declare const isFailType: <E>(self: Cause<E>) => self is Fail<E>
```

Added in v2.0.0

## isIllegalArgumentException

Returns `true` if the specified value is an `IllegalArgumentException`, `false`
otherwise.

**Signature**

```ts
export declare const isIllegalArgumentException: (u: unknown) => u is IllegalArgumentException
```

Added in v2.0.0

## isInterruptType

Returns `true` if the specified `Cause` is an `Interrupt` type, `false`
otherwise.

**Signature**

```ts
export declare const isInterruptType: <E>(self: Cause<E>) => self is Interrupt
```

Added in v2.0.0

## isInterruptedException

Returns `true` if the specified value is an `InterruptedException`, `false`
otherwise.

**Signature**

```ts
export declare const isInterruptedException: (u: unknown) => u is InterruptedException
```

Added in v2.0.0

## isNoSuchElementException

Returns `true` if the specified value is an `NoSuchElementException`, `false`
otherwise.

**Signature**

```ts
export declare const isNoSuchElementException: (u: unknown) => u is NoSuchElementException
```

Added in v2.0.0

## isParallelType

Returns `true` if the specified `Cause` is a `Parallel` type, `false`
otherwise.

**Signature**

```ts
export declare const isParallelType: <E>(self: Cause<E>) => self is Parallel<E>
```

Added in v2.0.0

## isRuntimeException

Returns `true` if the specified value is an `RuntimeException`, `false`
otherwise.

**Signature**

```ts
export declare const isRuntimeException: (u: unknown) => u is RuntimeException
```

Added in v2.0.0

## isSequentialType

Returns `true` if the specified `Cause` is a `Sequential` type, `false`
otherwise.

**Signature**

```ts
export declare const isSequentialType: <E>(self: Cause<E>) => self is Sequential<E>
```

Added in v2.0.0

# rendering

## pretty

Returns the specified `Cause` as a pretty-printed string.

**Signature**

```ts
export declare const pretty: <E>(cause: Cause<E>) => string
```

Added in v2.0.0

# sequencing

## andThen

Executes a sequence of two `Cause`s. The second `Cause` can be dependent on the result of the first `Cause`.

**Signature**

```ts
export declare const andThen: {
  <E, E2>(f: (e: E) => Cause<E2>): (self: Cause<E>) => Cause<E2>
  <E2>(f: Cause<E2>): <E>(self: Cause<E>) => Cause<E2>
  <E, E2>(self: Cause<E>, f: (e: E) => Cause<E2>): Cause<E2>
  <E, E2>(self: Cause<E>, f: Cause<E2>): Cause<E2>
}
```

Added in v2.0.0

## flatMap

**Signature**

```ts
export declare const flatMap: {
  <E, E2>(f: (e: E) => Cause<E2>): (self: Cause<E>) => Cause<E2>
  <E, E2>(self: Cause<E>, f: (e: E) => Cause<E2>): Cause<E2>
}
```

Added in v2.0.0

## flatten

**Signature**

```ts
export declare const flatten: <E>(self: Cause<Cause<E>>) => Cause<E>
```

Added in v2.0.0

# symbols

## CauseTypeId

**Signature**

```ts
export declare const CauseTypeId: typeof CauseTypeId
```

Added in v2.0.0

## CauseTypeId (type alias)

**Signature**

```ts
export type CauseTypeId = typeof CauseTypeId
```

Added in v2.0.0

## IllegalArgumentExceptionTypeId

**Signature**

```ts
export declare const IllegalArgumentExceptionTypeId: typeof IllegalArgumentExceptionTypeId
```

Added in v2.0.0

## IllegalArgumentExceptionTypeId (type alias)

**Signature**

```ts
export type IllegalArgumentExceptionTypeId = typeof IllegalArgumentExceptionTypeId
```

Added in v2.0.0

## InterruptedExceptionTypeId

**Signature**

```ts
export declare const InterruptedExceptionTypeId: typeof InterruptedExceptionTypeId
```

Added in v2.0.0

## InterruptedExceptionTypeId (type alias)

**Signature**

```ts
export type InterruptedExceptionTypeId = typeof InterruptedExceptionTypeId
```

Added in v2.0.0

## InvalidPubSubCapacityExceptionTypeId

**Signature**

```ts
export declare const InvalidPubSubCapacityExceptionTypeId: typeof InvalidPubSubCapacityExceptionTypeId
```

Added in v2.0.0

## InvalidPubSubCapacityExceptionTypeId (type alias)

**Signature**

```ts
export type InvalidPubSubCapacityExceptionTypeId = typeof InvalidPubSubCapacityExceptionTypeId
```

Added in v2.0.0

## NoSuchElementExceptionTypeId

**Signature**

```ts
export declare const NoSuchElementExceptionTypeId: typeof NoSuchElementExceptionTypeId
```

Added in v2.0.0

## NoSuchElementExceptionTypeId (type alias)

**Signature**

```ts
export type NoSuchElementExceptionTypeId = typeof NoSuchElementExceptionTypeId
```

Added in v2.0.0

## RuntimeExceptionTypeId

**Signature**

```ts
export declare const RuntimeExceptionTypeId: typeof RuntimeExceptionTypeId
```

Added in v2.0.0

## RuntimeExceptionTypeId (type alias)

**Signature**

```ts
export type RuntimeExceptionTypeId = typeof RuntimeExceptionTypeId
```

Added in v2.0.0

# utils

## Cause (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<out E> {
  readonly [CauseTypeId]: {
    readonly _E: (_: never) => E
  }
}
```

Added in v2.0.0
