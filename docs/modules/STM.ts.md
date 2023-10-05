---
title: STM.ts
nav_order: 108
parent: Modules
---

## STM overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [acquireUseRelease](#acquireuserelease)
  - [all](#all)
  - [attempt](#attempt)
  - [check](#check)
  - [cond](#cond)
  - [context](#context)
  - [contextWith](#contextwith)
  - [contextWithSTM](#contextwithstm)
  - [die](#die)
  - [dieMessage](#diemessage)
  - [dieSync](#diesync)
  - [every](#every)
  - [exists](#exists)
  - [fail](#fail)
  - [failSync](#failsync)
  - [fiberId](#fiberid)
  - [filter](#filter)
  - [filterNot](#filternot)
  - [fromEither](#fromeither)
  - [fromOption](#fromoption)
  - [gen](#gen)
  - [interrupt](#interrupt)
  - [interruptAs](#interruptas)
  - [iterate](#iterate)
  - [loop](#loop)
  - [mergeAll](#mergeall)
  - [reduce](#reduce)
  - [reduceAll](#reduceall)
  - [reduceRight](#reduceright)
  - [replicate](#replicate)
  - [replicateSTM](#replicatestm)
  - [replicateSTMDiscard](#replicatestmdiscard)
  - [succeed](#succeed)
  - [succeedNone](#succeednone)
  - [succeedSome](#succeedsome)
  - [suspend](#suspend)
  - [sync](#sync)
  - [try](#try)
  - [unit](#unit)
- [context](#context-1)
  - [mapInputContext](#mapinputcontext)
  - [provideContext](#providecontext)
  - [provideService](#provideservice)
  - [provideServiceSTM](#provideservicestm)
  - [provideSomeContext](#providesomecontext)
- [destructors](#destructors)
  - [commit](#commit)
  - [commitEither](#commiteither)
- [do notation](#do-notation)
  - [Do](#do)
  - [bind](#bind)
  - [bindTo](#bindto)
  - [let](#let)
- [elements](#elements)
  - [firstSuccessOf](#firstsuccessof)
- [error handling](#error-handling)
  - [catchAll](#catchall)
  - [catchSome](#catchsome)
  - [catchTag](#catchtag)
  - [catchTags](#catchtags)
  - [orDie](#ordie)
  - [orDieWith](#ordiewith)
  - [orElse](#orelse)
  - [orElseEither](#orelseeither)
  - [orElseFail](#orelsefail)
  - [orElseOptional](#orelseoptional)
  - [orElseSucceed](#orelsesucceed)
  - [orTry](#ortry)
  - [retry](#retry)
- [filtering](#filtering)
  - [filterOrDie](#filterordie)
  - [filterOrDieMessage](#filterordiemessage)
  - [filterOrElse](#filterorelse)
  - [filterOrFail](#filterorfail)
- [finalization](#finalization)
  - [ensuring](#ensuring)
- [folding](#folding)
  - [match](#match)
  - [matchSTM](#matchstm)
- [getters](#getters)
  - [head](#head)
  - [isFailure](#isfailure)
  - [isSuccess](#issuccess)
  - [some](#some)
  - [unsome](#unsome)
- [mapping](#mapping)
  - [as](#as)
  - [asSome](#assome)
  - [asSomeError](#assomeerror)
  - [asUnit](#asunit)
  - [map](#map)
  - [mapAttempt](#mapattempt)
  - [mapBoth](#mapboth)
  - [mapError](#maperror)
- [models](#models)
  - [Adapter (interface)](#adapter-interface)
  - [STM (interface)](#stm-interface)
  - [STMGen (interface)](#stmgen-interface)
  - [STMUnify (interface)](#stmunify-interface)
  - [STMUnifyBlacklist (interface)](#stmunifyblacklist-interface)
- [mutations](#mutations)
  - [collect](#collect)
  - [collectSTM](#collectstm)
  - [either](#either)
  - [eventually](#eventually)
  - [flip](#flip)
  - [flipWith](#flipwith)
  - [if](#if)
  - [ignore](#ignore)
  - [merge](#merge)
  - [negate](#negate)
  - [none](#none)
  - [option](#option)
  - [refineOrDie](#refineordie)
  - [refineOrDieWith](#refineordiewith)
  - [reject](#reject)
  - [rejectSTM](#rejectstm)
  - [repeatUntil](#repeatuntil)
  - [repeatWhile](#repeatwhile)
  - [retryUntil](#retryuntil)
  - [retryWhile](#retrywhile)
  - [summarized](#summarized)
  - [unless](#unless)
  - [unlessSTM](#unlessstm)
  - [validateAll](#validateall)
  - [validateFirst](#validatefirst)
  - [when](#when)
  - [whenSTM](#whenstm)
- [refinements](#refinements)
  - [isSTM](#isstm)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
  - [tap](#tap)
  - [tapBoth](#tapboth)
  - [tapError](#taperror)
- [symbols](#symbols)
  - [STMTypeId](#stmtypeid)
  - [STMTypeId (type alias)](#stmtypeid-type-alias)
- [traversing](#traversing)
  - [forEach](#foreach)
  - [partition](#partition)
- [type lambdas](#type-lambdas)
  - [STMTypeLambda (interface)](#stmtypelambda-interface)
- [utils](#utils)
  - [All (namespace)](#all-namespace)
    - [Signature (interface)](#signature-interface)
    - [Options (type alias)](#options-type-alias)
  - [STM (namespace)](#stm-namespace)
    - [Variance (interface)](#variance-interface)
- [zipping](#zipping)
  - [zip](#zip)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)

---

# constructors

## acquireUseRelease

Treats the specified `acquire` transaction as the acquisition of a
resource. The `acquire` transaction will be executed interruptibly. If it
is a success and is committed the specified `release` workflow will be
executed uninterruptibly as soon as the `use` workflow completes execution.

**Signature**

```ts
export declare const acquireUseRelease: {
  <A, R2, E2, A2, R3, E3, A3>(use: (resource: A) => STM<R2, E2, A2>, release: (resource: A) => STM<R3, E3, A3>): <R, E>(
    acquire: STM<R, E, A>
  ) => Effect.Effect<R2 | R3 | R, E2 | E3 | E, A2>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    acquire: STM<R, E, A>,
    use: (resource: A) => STM<R2, E2, A2>,
    release: (resource: A) => STM<R3, E3, A3>
  ): Effect.Effect<R | R2 | R3, E | E2 | E3, A2>
}
```

Added in v2.0.0

## all

Runs all the provided transactional effects in sequence respecting the
structure provided in input.

Supports multiple arguments, a single argument tuple / array or record /
struct.

**Signature**

```ts
export declare const all: All.Signature
```

Added in v2.0.0

## attempt

Creates an `STM` value from a partial (but pure) function.

**Signature**

```ts
export declare const attempt: <A>(evaluate: LazyArg<A>) => STM<never, unknown, A>
```

Added in v2.0.0

## check

Checks the condition, and if it's true, returns unit, otherwise, retries.

**Signature**

```ts
export declare const check: (predicate: LazyArg<boolean>) => STM<never, never, void>
```

Added in v2.0.0

## cond

Similar to Either.cond, evaluate the predicate, return the given A as
success if predicate returns true, and the given E as error otherwise

**Signature**

```ts
export declare const cond: <E, A>(
  predicate: LazyArg<boolean>,
  error: LazyArg<E>,
  result: LazyArg<A>
) => STM<never, E, A>
```

Added in v2.0.0

## context

Retrieves the environment inside an stm.

**Signature**

```ts
export declare const context: <R>() => STM<R, never, Context.Context<R>>
```

Added in v2.0.0

## contextWith

Accesses the environment of the transaction to perform a transaction.

**Signature**

```ts
export declare const contextWith: <R0, R>(f: (environment: Context.Context<R0>) => R) => STM<R0, never, R>
```

Added in v2.0.0

## contextWithSTM

Accesses the environment of the transaction to perform a transaction.

**Signature**

```ts
export declare const contextWithSTM: <R0, R, E, A>(
  f: (environment: Context.Context<R0>) => STM<R, E, A>
) => STM<R0 | R, E, A>
```

Added in v2.0.0

## die

Fails the transactional effect with the specified defect.

**Signature**

```ts
export declare const die: (defect: unknown) => STM<never, never, never>
```

Added in v2.0.0

## dieMessage

Kills the fiber running the effect with a `Cause.RuntimeException` that
contains the specified message.

**Signature**

```ts
export declare const dieMessage: (message: string) => STM<never, never, never>
```

Added in v2.0.0

## dieSync

Fails the transactional effect with the specified lazily evaluated defect.

**Signature**

```ts
export declare const dieSync: (evaluate: LazyArg<unknown>) => STM<never, never, never>
```

Added in v2.0.0

## every

Determines whether all elements of the `Iterable<A>` satisfy the effectual
predicate.

**Signature**

```ts
export declare const every: {
  <A, R, E>(predicate: (a: A) => STM<R, E, boolean>): (iterable: Iterable<A>) => STM<R, E, boolean>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<R, E, boolean>): STM<R, E, boolean>
}
```

Added in v2.0.0

## exists

Determines whether any element of the `Iterable[A]` satisfies the effectual
predicate `f`.

**Signature**

```ts
export declare const exists: {
  <A, R, E>(predicate: (a: A) => STM<R, E, boolean>): (iterable: Iterable<A>) => STM<R, E, boolean>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<R, E, boolean>): STM<R, E, boolean>
}
```

Added in v2.0.0

## fail

Fails the transactional effect with the specified error.

**Signature**

```ts
export declare const fail: <E>(error: E) => STM<never, E, never>
```

Added in v2.0.0

## failSync

Fails the transactional effect with the specified lazily evaluated error.

**Signature**

```ts
export declare const failSync: <E>(evaluate: LazyArg<E>) => STM<never, E, never>
```

Added in v2.0.0

## fiberId

Returns the fiber id of the fiber committing the transaction.

**Signature**

```ts
export declare const fiberId: STM<never, never, FiberId.FiberId>
```

Added in v2.0.0

## filter

Filters the collection using the specified effectual predicate.

**Signature**

```ts
export declare const filter: {
  <A, R, E>(predicate: (a: A) => STM<R, E, boolean>): (iterable: Iterable<A>) => STM<R, E, A[]>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<R, E, boolean>): STM<R, E, A[]>
}
```

Added in v2.0.0

## filterNot

Filters the collection using the specified effectual predicate, removing
all elements that satisfy the predicate.

**Signature**

```ts
export declare const filterNot: {
  <A, R, E>(predicate: (a: A) => STM<R, E, boolean>): (iterable: Iterable<A>) => STM<R, E, A[]>
  <A, R, E>(iterable: Iterable<A>, predicate: (a: A) => STM<R, E, boolean>): STM<R, E, A[]>
}
```

Added in v2.0.0

## fromEither

Lifts an `Either` into a `STM`.

**Signature**

```ts
export declare const fromEither: <E, A>(either: Either.Either<E, A>) => STM<never, E, A>
```

Added in v2.0.0

## fromOption

Lifts an `Option` into a `STM`.

**Signature**

```ts
export declare const fromOption: <A>(option: Option.Option<A>) => STM<never, Option.Option<never>, A>
```

Added in v2.0.0

## gen

**Signature**

```ts
export declare const gen: <Eff extends STMGen<any, any, any>, AEff>(
  f: (resume: Adapter) => Generator<Eff, AEff, any>
) => STM<
  [Eff] extends [never] ? never : [Eff] extends [STMGen<infer R, any, any>] ? R : never,
  [Eff] extends [never] ? never : [Eff] extends [STMGen<any, infer E, any>] ? E : never,
  AEff
>
```

Added in v2.0.0

## interrupt

Interrupts the fiber running the effect.

**Signature**

```ts
export declare const interrupt: STM<never, never, never>
```

Added in v2.0.0

## interruptAs

Interrupts the fiber running the effect with the specified `FiberId`.

**Signature**

```ts
export declare const interruptAs: (fiberId: FiberId.FiberId) => STM<never, never, never>
```

Added in v2.0.0

## iterate

Iterates with the specified transactional function. The moral equivalent
of:

```ts
const s = initial

while (cont(s)) {
  s = body(s)
}

return s
```

**Signature**

```ts
export declare const iterate: <R, E, Z>(
  initial: Z,
  options: { readonly while: (z: Z) => boolean; readonly body: (z: Z) => STM<R, E, Z> }
) => STM<R, E, Z>
```

Added in v2.0.0

## loop

Loops with the specified transactional function, collecting the results
into a list. The moral equivalent of:

```ts
const as = []
let s = initial

while (cont(s)) {
  as.push(body(s))
  s = inc(s)
}

return as
```

**Signature**

```ts
export declare const loop: {
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: (z: Z) => boolean
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => STM<R, E, A>
      readonly discard?: false | undefined
    }
  ): STM<R, E, A[]>
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: (z: Z) => boolean
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => STM<R, E, A>
      readonly discard: true
    }
  ): STM<R, E, void>
}
```

Added in v2.0.0

## mergeAll

Merges an `Iterable<STM>` to a single `STM`, working sequentially.

**Signature**

```ts
export declare const mergeAll: {
  <A2, A>(zero: A2, f: (a2: A2, a: A) => A2): <R, E>(iterable: Iterable<STM<R, E, A>>) => STM<R, E, A2>
  <R, E, A2, A>(iterable: Iterable<STM<R, E, A>>, zero: A2, f: (a2: A2, a: A) => A2): STM<R, E, A2>
}
```

Added in v2.0.0

## reduce

Folds an `Iterable<A>` using an effectual function f, working sequentially
from left to right.

**Signature**

```ts
export declare const reduce: {
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM<R, E, S>): (iterable: Iterable<A>) => STM<R, E, S>
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM<R, E, S>): STM<R, E, S>
}
```

Added in v2.0.0

## reduceAll

Reduces an `Iterable<STM>` to a single `STM`, working sequentially.

**Signature**

```ts
export declare const reduceAll: {
  <R2, E2, A>(initial: STM<R2, E2, A>, f: (x: A, y: A) => A): <R, E>(
    iterable: Iterable<STM<R, E, A>>
  ) => STM<R2 | R, E2 | E, A>
  <R, E, R2, E2, A>(iterable: Iterable<STM<R, E, A>>, initial: STM<R2, E2, A>, f: (x: A, y: A) => A): STM<
    R | R2,
    E | E2,
    A
  >
}
```

Added in v2.0.0

## reduceRight

Folds an `Iterable<A>` using an effectual function f, working sequentially
from right to left.

**Signature**

```ts
export declare const reduceRight: {
  <S, A, R, E>(zero: S, f: (s: S, a: A) => STM<R, E, S>): (iterable: Iterable<A>) => STM<R, E, S>
  <S, A, R, E>(iterable: Iterable<A>, zero: S, f: (s: S, a: A) => STM<R, E, S>): STM<R, E, S>
}
```

Added in v2.0.0

## replicate

Replicates the given effect n times. If 0 or negative numbers are given, an
empty `Chunk` will be returned.

**Signature**

```ts
export declare const replicate: {
  (n: number): <R, E, A>(self: STM<R, E, A>) => STM<R, E, A>[]
  <R, E, A>(self: STM<R, E, A>, n: number): STM<R, E, A>[]
}
```

Added in v2.0.0

## replicateSTM

Performs this transaction the specified number of times and collects the
results.

**Signature**

```ts
export declare const replicateSTM: {
  (n: number): <R, E, A>(self: STM<R, E, A>) => STM<R, E, A[]>
  <R, E, A>(self: STM<R, E, A>, n: number): STM<R, E, A[]>
}
```

Added in v2.0.0

## replicateSTMDiscard

Performs this transaction the specified number of times, discarding the
results.

**Signature**

```ts
export declare const replicateSTMDiscard: {
  (n: number): <R, E, A>(self: STM<R, E, A>) => STM<R, E, void>
  <R, E, A>(self: STM<R, E, A>, n: number): STM<R, E, void>
}
```

Added in v2.0.0

## succeed

Returns an `STM` effect that succeeds with the specified value.

**Signature**

```ts
export declare const succeed: <A>(value: A) => STM<never, never, A>
```

Added in v2.0.0

## succeedNone

Returns an effect with the empty value.

**Signature**

```ts
export declare const succeedNone: STM<never, never, Option.Option<never>>
```

Added in v2.0.0

## succeedSome

Returns an effect with the optional value.

**Signature**

```ts
export declare const succeedSome: <A>(value: A) => STM<never, never, Option.Option<A>>
```

Added in v2.0.0

## suspend

Suspends creation of the specified transaction lazily.

**Signature**

```ts
export declare const suspend: <R, E, A>(evaluate: LazyArg<STM<R, E, A>>) => STM<R, E, A>
```

Added in v2.0.0

## sync

Returns an `STM` effect that succeeds with the specified lazily evaluated
value.

**Signature**

```ts
export declare const sync: <A>(evaluate: () => A) => STM<never, never, A>
```

Added in v2.0.0

## try

Imports a synchronous side-effect into a pure value, translating any thrown
exceptions into typed failed effects.

**Signature**

```ts
export declare const try: { <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (u: unknown) => E; }): STM<never, E, A>; <A>(try_: LazyArg<A>): STM<never, unknown, A>; }
```

Added in v2.0.0

## unit

Returns an `STM` effect that succeeds with `Unit`.

**Signature**

```ts
export declare const unit: STM<never, never, void>
```

Added in v2.0.0

# context

## mapInputContext

Transforms the environment being provided to this effect with the specified
function.

**Signature**

```ts
export declare const mapInputContext: {
  <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>): <E, A>(self: STM<R, E, A>) => STM<R0, E, A>
  <E, A, R0, R>(self: STM<R, E, A>, f: (context: Context.Context<R0>) => Context.Context<R>): STM<R0, E, A>
}
```

Added in v2.0.0

## provideContext

Provides the transaction its required environment, which eliminates its
dependency on `R`.

**Signature**

```ts
export declare const provideContext: {
  <R>(env: Context.Context<R>): <E, A>(self: STM<R, E, A>) => STM<never, E, A>
  <E, A, R>(self: STM<R, E, A>, env: Context.Context<R>): STM<never, E, A>
}
```

Added in v2.0.0

## provideService

Provides the effect with the single service it requires. If the transactional
effect requires more than one service use `provideEnvironment` instead.

**Signature**

```ts
export declare const provideService: {
  <T extends Context.Tag<any, any>>(tag: T, resource: Context.Tag.Service<T>): <R, E, A>(
    self: STM<R, E, A>
  ) => STM<Exclude<R, Context.Tag.Identifier<T>>, E, A>
  <R, E, A, T extends Context.Tag<any, any>>(self: STM<R, E, A>, tag: T, resource: Context.Tag.Service<T>): STM<
    Exclude<R, Context.Tag.Identifier<T>>,
    E,
    A
  >
}
```

Added in v2.0.0

## provideServiceSTM

Provides the effect with the single service it requires. If the transactional
effect requires more than one service use `provideEnvironment` instead.

**Signature**

```ts
export declare const provideServiceSTM: {
  <T extends Context.Tag<any, any>, R1, E1>(tag: T, stm: STM<R1, E1, Context.Tag.Service<T>>): <R, E, A>(
    self: STM<R, E, A>
  ) => STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A>
  <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
    self: STM<R, E, A>,
    tag: T,
    stm: STM<R1, E1, Context.Tag.Service<T>>
  ): STM<R1 | Exclude<R, Context.Tag.Identifier<T>>, E | E1, A>
}
```

Added in v2.0.0

## provideSomeContext

Splits the context into two parts, providing one part using the
specified layer and leaving the remainder `R0`.

**Signature**

```ts
export declare const provideSomeContext: {
  <R>(context: Context.Context<R>): <R1, E, A>(self: STM<R1, E, A>) => STM<Exclude<R1, R>, E, A>
  <R, R1, E, A>(self: STM<R1, E, A>, context: Context.Context<R>): STM<Exclude<R1, R>, E, A>
}
```

Added in v2.0.0

# destructors

## commit

Commits this transaction atomically.

**Signature**

```ts
export declare const commit: <R, E, A>(self: STM<R, E, A>) => Effect.Effect<R, E, A>
```

Added in v2.0.0

## commitEither

Commits this transaction atomically, regardless of whether the transaction
is a success or a failure.

**Signature**

```ts
export declare const commitEither: <R, E, A>(self: STM<R, E, A>) => Effect.Effect<R, E, A>
```

Added in v2.0.0

# do notation

## Do

**Signature**

```ts
export declare const Do: STM<never, never, {}>
```

Added in v2.0.0

## bind

**Signature**

```ts
export declare const bind: {
  <N extends string, K, R2, E2, A>(tag: Exclude<N, keyof K>, f: (_: K) => STM<R2, E2, A>): <R, E>(
    self: STM<R, E, K>
  ) => STM<R2 | R, E2 | E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, N extends string, K, R2, E2, A>(
    self: STM<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => STM<R2, E2, A>
  ): STM<R | R2, E | E2, Effect.MergeRecord<K, { [k in N]: A }>>
}
```

Added in v2.0.0

## bindTo

**Signature**

```ts
export declare const bindTo: {
  <N extends string>(tag: N): <R, E, A>(self: STM<R, E, A>) => STM<R, E, Record<N, A>>
  <R, E, A, N extends string>(self: STM<R, E, A>, tag: N): STM<R, E, Record<N, A>>
}
```

Added in v2.0.0

## let

**Signature**

```ts
export declare const let: {
  <N extends string, K, A>(tag: Exclude<N, keyof K>, f: (_: K) => A): <R, E>(
    self: STM<R, E, K>
  ) => STM<R, E, Effect.MergeRecord<K, { [k in N]: A }>>
  <R, E, K, N extends string, A>(self: STM<R, E, K>, tag: Exclude<N, keyof K>, f: (_: K) => A): STM<
    R,
    E,
    Effect.MergeRecord<K, { [k in N]: A }>
  >
}
```

Added in v2.0.0

# elements

## firstSuccessOf

This function takes an iterable of `STM` values and returns a new
`STM` value that represents the first `STM` value in the iterable
that succeeds. If all of the `Effect` values in the iterable fail, then
the resulting `STM` value will fail as well.

This function is sequential, meaning that the `STM` values in the
iterable will be executed in sequence, and the first one that succeeds
will determine the outcome of the resulting `STM` value.

**Signature**

```ts
export declare const firstSuccessOf: <R, E, A>(effects: Iterable<STM<R, E, A>>) => STM<R, E, A>
```

Added in v2.0.0

# error handling

## catchAll

Recovers from all errors.

**Signature**

```ts
export declare const catchAll: {
  <E, R1, E1, B>(f: (e: E) => STM<R1, E1, B>): <R, A>(self: STM<R, E, A>) => STM<R1 | R, E1, B | A>
  <R, A, E, R1, E1, B>(self: STM<R, E, A>, f: (e: E) => STM<R1, E1, B>): STM<R | R1, E1, A | B>
}
```

Added in v2.0.0

## catchSome

Recovers from some or all of the error cases.

**Signature**

```ts
export declare const catchSome: {
  <E, R2, E2, A2>(pf: (error: E) => Option.Option<STM<R2, E2, A2>>): <R, A>(
    self: STM<R, E, A>
  ) => STM<R2 | R, E | E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: STM<R, E, A>, pf: (error: E) => Option.Option<STM<R2, E2, A2>>): STM<
    R | R2,
    E | E2,
    A | A2
  >
}
```

Added in v2.0.0

## catchTag

Recovers from the specified tagged error.

**Signature**

```ts
export declare const catchTag: {
  <K extends E['_tag'] & string, E extends { _tag: string }, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>
  ): <R, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E extends { _tag: string }, A, K extends E['_tag'] & string, R1, E1, A1>(
    self: STM<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => STM<R1, E1, A1>
  ): STM<R | R1, E1 | Exclude<E, { _tag: K }>, A | A1>
}
```

Added in v2.0.0

## catchTags

Recovers from multiple tagged errors.

**Signature**

```ts
export declare const catchTags: {
  <
    E extends { _tag: string },
    Cases extends { [K in E['_tag']]+?: ((error: Extract<E, { _tag: K }>) => STM<any, any, any>) | undefined }
  >(
    cases: Cases
  ): <R, A>(
    self: STM<R, E, A>
  ) => STM<
    | R
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<infer R, any, any> ? R : never }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, infer E, any> ? E : never }[keyof Cases],
    | A
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, any, infer A> ? A : never }[keyof Cases]
  >
  <
    R,
    E extends { _tag: string },
    A,
    Cases extends { [K in E['_tag']]+?: ((error: Extract<E, { _tag: K }>) => STM<any, any, any>) | undefined }
  >(
    self: STM<R, E, A>,
    cases: Cases
  ): STM<
    | R
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<infer R, any, any> ? R : never }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, infer E, any> ? E : never }[keyof Cases],
    | A
    | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => STM<any, any, infer A> ? A : never }[keyof Cases]
  >
}
```

Added in v2.0.0

## orDie

Translates `STM` effect failure into death of the fiber, making all
failures unchecked and not a part of the type of the effect.

**Signature**

```ts
export declare const orDie: <R, E, A>(self: STM<R, E, A>) => STM<R, never, A>
```

Added in v2.0.0

## orDieWith

Keeps none of the errors, and terminates the fiber running the `STM` effect
with them, using the specified function to convert the `E` into a defect.

**Signature**

```ts
export declare const orDieWith: {
  <E>(f: (error: E) => unknown): <R, A>(self: STM<R, E, A>) => STM<R, never, A>
  <R, A, E>(self: STM<R, E, A>, f: (error: E) => unknown): STM<R, never, A>
}
```

Added in v2.0.0

## orElse

Tries this effect first, and if it fails or retries, tries the other
effect.

**Signature**

```ts
export declare const orElse: {
  <R2, E2, A2>(that: LazyArg<STM<R2, E2, A2>>): <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: STM<R, E, A>, that: LazyArg<STM<R2, E2, A2>>): STM<R | R2, E2, A | A2>
}
```

Added in v2.0.0

## orElseEither

Returns a transactional effect that will produce the value of this effect
in left side, unless it fails or retries, in which case, it will produce
the value of the specified effect in right side.

**Signature**

```ts
export declare const orElseEither: {
  <R2, E2, A2>(that: LazyArg<STM<R2, E2, A2>>): <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2, Either.Either<A, A2>>
  <R, E, A, R2, E2, A2>(self: STM<R, E, A>, that: LazyArg<STM<R2, E2, A2>>): STM<R | R2, E2, Either.Either<A, A2>>
}
```

Added in v2.0.0

## orElseFail

Tries this effect first, and if it fails or retries, fails with the
specified error.

**Signature**

```ts
export declare const orElseFail: {
  <E2>(error: LazyArg<E2>): <R, E, A>(self: STM<R, E, A>) => STM<R, E2, A>
  <R, E, A, E2>(self: STM<R, E, A>, error: LazyArg<E2>): STM<R, E2, A>
}
```

Added in v2.0.0

## orElseOptional

Returns an effect that will produce the value of this effect, unless it
fails with the `None` value, in which case it will produce the value of the
specified effect.

**Signature**

```ts
export declare const orElseOptional: {
  <R2, E2, A2>(that: LazyArg<STM<R2, Option.Option<E2>, A2>>): <R, E, A>(
    self: STM<R, Option.Option<E>, A>
  ) => STM<R2 | R, Option.Option<E2 | E>, A2 | A>
  <R, E, A, R2, E2, A2>(self: STM<R, Option.Option<E>, A>, that: LazyArg<STM<R2, Option.Option<E2>, A2>>): STM<
    R | R2,
    Option.Option<E | E2>,
    A | A2
  >
}
```

Added in v2.0.0

## orElseSucceed

Tries this effect first, and if it fails or retries, succeeds with the
specified value.

**Signature**

```ts
export declare const orElseSucceed: {
  <A2>(value: LazyArg<A2>): <R, E, A>(self: STM<R, E, A>) => STM<R, never, A2 | A>
  <R, E, A, A2>(self: STM<R, E, A>, value: LazyArg<A2>): STM<R, never, A | A2>
}
```

Added in v2.0.0

## orTry

Tries this effect first, and if it enters retry, then it tries the other
effect. This is an equivalent of Haskell's orElse.

**Signature**

```ts
export declare const orTry: {
  <R1, E1, A1>(that: LazyArg<STM<R1, E1, A1>>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1 | A>
  <R, E, A, R1, E1, A1>(self: STM<R, E, A>, that: LazyArg<STM<R1, E1, A1>>): STM<R | R1, E | E1, A | A1>
}
```

Added in v2.0.0

## retry

Abort and retry the whole transaction when any of the underlying
transactional variables have changed.

**Signature**

```ts
export declare const retry: STM<never, never, never>
```

Added in v2.0.0

# filtering

## filterOrDie

Dies with specified defect if the predicate fails.

**Signature**

```ts
export declare const filterOrDie: {
  <A, B extends A>(refinement: Refinement<A, B>, defect: LazyArg<unknown>): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
  <A, X extends A>(predicate: Predicate<X>, defect: LazyArg<unknown>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A, B extends A>(self: STM<R, E, A>, refinement: Refinement<A, B>, defect: LazyArg<unknown>): STM<R, E, B>
  <R, E, A, X extends A>(self: STM<R, E, A>, predicate: Predicate<X>, defect: LazyArg<unknown>): STM<R, E, A>
}
```

Added in v2.0.0

## filterOrDieMessage

Dies with a `Cause.RuntimeException` having the specified message if the
predicate fails.

**Signature**

```ts
export declare const filterOrDieMessage: {
  <A, B extends A>(refinement: Refinement<A, B>, message: string): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
  <A, X extends A>(predicate: Predicate<X>, message: string): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A, B extends A>(self: STM<R, E, A>, refinement: Refinement<A, B>, message: string): STM<R, E, B>
  <R, E, A, X extends A>(self: STM<R, E, A>, predicate: Predicate<X>, message: string): STM<R, E, A>
}
```

Added in v2.0.0

## filterOrElse

Supplies `orElse` if the predicate fails.

**Signature**

```ts
export declare const filterOrElse: {
  <A, B extends A, X extends A, R2, E2, A2>(refinement: Refinement<A, B>, orElse: (a: X) => STM<R2, E2, A2>): <R, E>(
    self: STM<R, E, A>
  ) => STM<R2 | R, E2 | E, B | A2>
  <A, X extends A, Y extends A, R2, E2, A2>(predicate: Predicate<X>, orElse: (a: Y) => STM<R2, E2, A2>): <R, E>(
    self: STM<R, E, A>
  ) => STM<R2 | R, E2 | E, A | A2>
  <R, E, A, B extends A, X extends A, R2, E2, A2>(
    self: STM<R, E, A>,
    refinement: Refinement<A, B>,
    orElse: (a: X) => STM<R2, E2, A2>
  ): STM<R | R2, E | E2, B | A2>
  <R, E, A, X extends A, Y extends A, R2, E2, A2>(
    self: STM<R, E, A>,
    predicate: Predicate<X>,
    orElse: (a: Y) => STM<R2, E2, A2>
  ): STM<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## filterOrFail

Fails with the specified error if the predicate fails.

**Signature**

```ts
export declare const filterOrFail: {
  <A, B extends A, X extends A, E2>(refinement: Refinement<A, B>, orFailWith: (a: X) => E2): <R, E>(
    self: STM<R, E, A>
  ) => STM<R, E2 | E, B>
  <A, X extends A, Y extends A, E2>(predicate: Predicate<X>, orFailWith: (a: Y) => E2): <R, E>(
    self: STM<R, E, A>
  ) => STM<R, E2 | E, A>
  <R, E, A, B extends A, X extends A, E2>(
    self: STM<R, E, A>,
    refinement: Refinement<A, B>,
    orFailWith: (a: X) => E2
  ): STM<R, E | E2, B>
  <R, E, A, X extends A, Y extends A, E2>(self: STM<R, E, A>, predicate: Predicate<X>, orFailWith: (a: Y) => E2): STM<
    R,
    E | E2,
    A
  >
}
```

Added in v2.0.0

# finalization

## ensuring

Executes the specified finalization transaction whether or not this effect
succeeds. Note that as with all STM transactions, if the full transaction
fails, everything will be rolled back.

**Signature**

```ts
export declare const ensuring: {
  <R1, B>(finalizer: STM<R1, never, B>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E, A>
  <R, E, A, R1, B>(self: STM<R, E, A>, finalizer: STM<R1, never, B>): STM<R | R1, E, A>
}
```

Added in v2.0.0

# folding

## match

Folds over the `STM` effect, handling both failure and success, but not
retry.

**Signature**

```ts
export declare const match: {
  <E, A2, A, A3>(options: { readonly onFailure: (error: E) => A2; readonly onSuccess: (value: A) => A3 }): <R>(
    self: STM<R, E, A>
  ) => STM<R, never, A2 | A3>
  <R, E, A2, A, A3>(
    self: STM<R, E, A>,
    options: { readonly onFailure: (error: E) => A2; readonly onSuccess: (value: A) => A3 }
  ): STM<R, never, A2 | A3>
}
```

Added in v2.0.0

## matchSTM

Effectfully folds over the `STM` effect, handling both failure and success.

**Signature**

```ts
export declare const matchSTM: {
  <E, R1, E1, A1, A, R2, E2, A2>(options: {
    readonly onFailure: (e: E) => STM<R1, E1, A1>
    readonly onSuccess: (a: A) => STM<R2, E2, A2>
  }): <R>(self: STM<R, E, A>) => STM<R1 | R2 | R, E1 | E2, A1 | A2>
  <R, E, R1, E1, A1, A, R2, E2, A2>(
    self: STM<R, E, A>,
    options: { readonly onFailure: (e: E) => STM<R1, E1, A1>; readonly onSuccess: (a: A) => STM<R2, E2, A2> }
  ): STM<R | R1 | R2, E1 | E2, A1 | A2>
}
```

Added in v2.0.0

# getters

## head

Returns a successful effect with the head of the list if the list is
non-empty or fails with the error `None` if the list is empty.

**Signature**

```ts
export declare const head: <R, E, A>(self: STM<R, E, Iterable<A>>) => STM<R, Option.Option<E>, A>
```

Added in v2.0.0

## isFailure

Returns whether this transactional effect is a failure.

**Signature**

```ts
export declare const isFailure: <R, E, A>(self: STM<R, E, A>) => STM<R, never, boolean>
```

Added in v2.0.0

## isSuccess

Returns whether this transactional effect is a success.

**Signature**

```ts
export declare const isSuccess: <R, E, A>(self: STM<R, E, A>) => STM<R, never, boolean>
```

Added in v2.0.0

## some

Converts an option on values into an option on errors.

**Signature**

```ts
export declare const some: <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R, Option.Option<E>, A>
```

Added in v2.0.0

## unsome

Converts an option on errors into an option on values.

**Signature**

```ts
export declare const unsome: <R, E, A>(self: STM<R, Option.Option<E>, A>) => STM<R, E, Option.Option<A>>
```

Added in v2.0.0

# mapping

## as

Maps the success value of this effect to the specified constant value.

**Signature**

```ts
export declare const as: {
  <A2>(value: A2): <R, E, A>(self: STM<R, E, A>) => STM<R, E, A2>
  <R, E, A, A2>(self: STM<R, E, A>, value: A2): STM<R, E, A2>
}
```

Added in v2.0.0

## asSome

Maps the success value of this effect to an optional value.

**Signature**

```ts
export declare const asSome: <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>>
```

Added in v2.0.0

## asSomeError

Maps the error value of this effect to an optional value.

**Signature**

```ts
export declare const asSomeError: <R, E, A>(self: STM<R, E, A>) => STM<R, Option.Option<E>, A>
```

Added in v2.0.0

## asUnit

This function maps the success value of an `STM` to `void`. If the original
`STM` succeeds, the returned `STM` will also succeed. If the original `STM`
fails, the returned `STM` will fail with the same error.

**Signature**

```ts
export declare const asUnit: <R, E, A>(self: STM<R, E, A>) => STM<R, E, void>
```

Added in v2.0.0

## map

Maps the value produced by the effect.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: STM<R, E, A>) => STM<R, E, B>
  <R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B): STM<R, E, B>
}
```

Added in v2.0.0

## mapAttempt

Maps the value produced by the effect with the specified function that may
throw exceptions but is otherwise pure, translating any thrown exceptions
into typed failed effects.

**Signature**

```ts
export declare const mapAttempt: {
  <A, B>(f: (a: A) => B): <R, E>(self: STM<R, E, A>) => STM<R, unknown, B>
  <R, E, A, B>(self: STM<R, E, A>, f: (a: A) => B): STM<R, unknown, B>
}
```

Added in v2.0.0

## mapBoth

Returns an `STM` effect whose failure and success channels have been mapped
by the specified pair of functions, `f` and `g`.

**Signature**

```ts
export declare const mapBoth: {
  <E, E2, A, A2>(options: { readonly onFailure: (error: E) => E2; readonly onSuccess: (value: A) => A2 }): <R>(
    self: STM<R, E, A>
  ) => STM<R, E2, A2>
  <R, E, E2, A, A2>(
    self: STM<R, E, A>,
    options: { readonly onFailure: (error: E) => E2; readonly onSuccess: (value: A) => A2 }
  ): STM<R, E2, A2>
}
```

Added in v2.0.0

## mapError

Maps from one error type to another.

**Signature**

```ts
export declare const mapError: {
  <E, E2>(f: (error: E) => E2): <R, A>(self: STM<R, E, A>) => STM<R, E2, A>
  <R, A, E, E2>(self: STM<R, E, A>, f: (error: E) => E2): STM<R, E2, A>
}
```

Added in v2.0.0

# models

## Adapter (interface)

**Signature**

```ts
export interface Adapter {
  <R, E, A>(self: STM<R, E, A>): STMGen<R, E, A>
  <A, _R, _E, _A>(a: A, ab: (a: A) => STM<_R, _E, _A>): STMGen<_R, _E, _A>
  <A, B, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => STM<_R, _E, _A>): STMGen<_R, _E, _A>
  <A, B, C, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => STM<_R, _E, _A>): STMGen<_R, _E, _A>
  <A, B, C, D, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: F) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (g: H) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (h: H) => I,
    ij: (i: I) => J,
    jk: (j: J) => K,
    kl: (k: K) => L,
    lm: (l: L) => M,
    mn: (m: M) => N,
    no: (n: N) => O,
    op: (o: O) => P,
    pq: (p: P) => Q,
    qr: (q: Q) => R,
    rs: (r: R) => S,
    st: (s: S) => T,
    tu: (s: T) => STM<_R, _E, _A>
  ): STMGen<_R, _E, _A>
}
```

Added in v2.0.0

## STM (interface)

`STM<R, E, A>` represents an effect that can be performed transactionally,
resulting in a failure `E` or a value `A` that may require an environment
`R` to execute.

Software Transactional Memory is a technique which allows composition of
arbitrary atomic operations. It is the software analog of transactions in
database systems.

The API is lifted directly from the Haskell package Control.Concurrent.STM
although the implementation does not resemble the Haskell one at all.

See http://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html

STM in Haskell was introduced in:

Composable memory transactions, by Tim Harris, Simon Marlow, Simon Peyton
Jones, and Maurice Herlihy, in ACM Conference on Principles and Practice of
Parallel Programming 2005.

See https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/

See also:
Lock Free Data Structures using STMs in Haskell, by Anthony Discolo, Tim
Harris, Simon Marlow, Simon Peyton Jones, Satnam Singh) FLOPS 2006: Eighth
International Symposium on Functional and Logic Programming, Fuji Susono,
JAPAN, April 2006

https://www.microsoft.com/en-us/research/publication/lock-free-data-structures-using-stms-in-haskell/

The implemtation is based on the ZIO STM module, while JS environments have
no race conditions from multiple threads STM provides greater benefits for
synchronization of Fibers and transactional data-types can be quite useful.

**Signature**

```ts
export interface STM<R, E, A> extends Effect.Effect<R, E, A>, STM.Variance<R, E, A>, Pipeable {
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: STMUnify<this>
  [Unify.blacklistSymbol]?: STMUnifyBlacklist
}
```

Added in v2.0.0

## STMGen (interface)

**Signature**

```ts
export interface STMGen<R, E, A> {
  readonly _R: () => R
  readonly _E: () => E
  readonly _A: () => A
  readonly value: STM<R, E, A>
  [Symbol.iterator](): Generator<STMGen<R, E, A>, A>
}
```

Added in v2.0.0

## STMUnify (interface)

**Signature**

```ts
export interface STMUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  STM?: () => A[Unify.typeSymbol] extends STM<infer R0, infer E0, infer A0> | infer _ ? STM<R0, E0, A0> : never
}
```

Added in v2.0.0

## STMUnifyBlacklist (interface)

**Signature**

```ts
export interface STMUnifyBlacklist extends Effect.EffectUnifyBlacklist {
  Effect?: true
}
```

Added in v2.0.0

# mutations

## collect

Simultaneously filters and maps the value produced by this effect.

**Signature**

```ts
export declare const collect: {
  <A, A2>(pf: (a: A) => Option.Option<A2>): <R, E>(self: STM<R, E, A>) => STM<R, E, A2>
  <R, E, A, A2>(self: STM<R, E, A>, pf: (a: A) => Option.Option<A2>): STM<R, E, A2>
}
```

Added in v2.0.0

## collectSTM

Simultaneously filters and maps the value produced by this effect.

**Signature**

```ts
export declare const collectSTM: {
  <A, R2, E2, A2>(pf: (a: A) => Option.Option<STM<R2, E2, A2>>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: STM<R, E, A>, pf: (a: A) => Option.Option<STM<R2, E2, A2>>): STM<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## either

Converts the failure channel into an `Either`.

**Signature**

```ts
export declare const either: <R, E, A>(self: STM<R, E, A>) => STM<R, never, Either.Either<E, A>>
```

Added in v2.0.0

## eventually

Returns an effect that ignores errors and runs repeatedly until it
eventually succeeds.

**Signature**

```ts
export declare const eventually: <R, E, A>(self: STM<R, E, A>) => STM<R, E, A>
```

Added in v2.0.0

## flip

Flips the success and failure channels of this transactional effect. This
allows you to use all methods on the error channel, possibly before
flipping back.

**Signature**

```ts
export declare const flip: <R, E, A>(self: STM<R, E, A>) => STM<R, A, E>
```

Added in v2.0.0

## flipWith

Swaps the error/value parameters, applies the function `f` and flips the
parameters back

**Signature**

```ts
export declare const flipWith: {
  <R, A, E, R2, A2, E2>(f: (stm: STM<R, A, E>) => STM<R2, A2, E2>): (self: STM<R, E, A>) => STM<R | R2, E | E2, A | A2>
  <R, A, E, R2, A2, E2>(self: STM<R, E, A>, f: (stm: STM<R, A, E>) => STM<R2, A2, E2>): STM<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## if

Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.

**Signature**

```ts
export declare const if: { <R1, R2, E1, E2, A, A1>(options: { readonly onTrue: STM<R1, E1, A>; readonly onFalse: STM<R2, E2, A1>; }): <R = never, E = never>(self: boolean | STM<R, E, boolean>) => STM<R1 | R2 | R, E1 | E2 | E, A | A1>; <R, E, R1, R2, E1, E2, A, A1>(self: boolean, options: { readonly onTrue: STM<R1, E1, A>; readonly onFalse: STM<R2, E2, A1>; }): STM<R | R1 | R2, E | E1 | E2, A | A1>; <R, E, R1, R2, E1, E2, A, A1>(self: STM<R, E, boolean>, options: { readonly onTrue: STM<R1, E1, A>; readonly onFalse: STM<R2, E2, A1>; }): STM<R | R1 | R2, E | E1 | E2, A | A1>; }
```

Added in v2.0.0

## ignore

Returns a new effect that ignores the success or failure of this effect.

**Signature**

```ts
export declare const ignore: <R, E, A>(self: STM<R, E, A>) => STM<R, never, void>
```

Added in v2.0.0

## merge

Returns a new effect where the error channel has been merged into the
success channel to their common combined type.

**Signature**

```ts
export declare const merge: <R, E, A>(self: STM<R, E, A>) => STM<R, never, E | A>
```

Added in v2.0.0

## negate

Returns a new effect where boolean value of this effect is negated.

**Signature**

```ts
export declare const negate: <R, E>(self: STM<R, E, boolean>) => STM<R, E, boolean>
```

Added in v2.0.0

## none

Requires the option produced by this value to be `None`.

**Signature**

```ts
export declare const none: <R, E, A>(self: STM<R, E, Option.Option<A>>) => STM<R, Option.Option<E>, void>
```

Added in v2.0.0

## option

Converts the failure channel into an `Option`.

**Signature**

```ts
export declare const option: <R, E, A>(self: STM<R, E, A>) => STM<R, never, Option.Option<A>>
```

Added in v2.0.0

## refineOrDie

Keeps some of the errors, and terminates the fiber with the rest.

**Signature**

```ts
export declare const refineOrDie: {
  <E, E2>(pf: (error: E) => Option.Option<E2>): <R, A>(self: STM<R, E, A>) => STM<R, E2, A>
  <R, A, E, E2>(self: STM<R, E, A>, pf: (error: E) => Option.Option<E2>): STM<R, E2, A>
}
```

Added in v2.0.0

## refineOrDieWith

Keeps some of the errors, and terminates the fiber with the rest, using the
specified function to convert the `E` into a `Throwable`.

**Signature**

```ts
export declare const refineOrDieWith: {
  <E, E2>(pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): <R, A>(self: STM<R, E, A>) => STM<R, E2, A>
  <R, A, E, E2>(self: STM<R, E, A>, pf: (error: E) => Option.Option<E2>, f: (error: E) => unknown): STM<R, E2, A>
}
```

Added in v2.0.0

## reject

Fail with the returned value if the `PartialFunction` matches, otherwise
continue with our held value.

**Signature**

```ts
export declare const reject: {
  <A, E2>(pf: (a: A) => Option.Option<E2>): <R, E>(self: STM<R, E, A>) => STM<R, E2 | E, A>
  <R, E, A, E2>(self: STM<R, E, A>, pf: (a: A) => Option.Option<E2>): STM<R, E | E2, A>
}
```

Added in v2.0.0

## rejectSTM

Continue with the returned computation if the specified partial function
matches, translating the successful match into a failure, otherwise continue
with our held value.

**Signature**

```ts
export declare const rejectSTM: {
  <A, R2, E2>(pf: (a: A) => Option.Option<STM<R2, E2, E2>>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(self: STM<R, E, A>, pf: (a: A) => Option.Option<STM<R2, E2, E2>>): STM<R | R2, E | E2, A>
}
```

Added in v2.0.0

## repeatUntil

Repeats this `STM` effect until its result satisfies the specified
predicate.

**WARNING**: `repeatUntil` uses a busy loop to repeat the effect and will
consume a thread until it completes (it cannot yield). This is because STM
describes a single atomic transaction which must either complete, retry or
fail a transaction before yielding back to the Effect runtime.

- Use `retryUntil` instead if you don't need to maintain transaction
  state for repeats.
- Ensure repeating the STM effect will eventually satisfy the predicate.

**Signature**

```ts
export declare const repeatUntil: {
  <A>(predicate: Predicate<A>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A>(self: STM<R, E, A>, predicate: Predicate<A>): STM<R, E, A>
}
```

Added in v2.0.0

## repeatWhile

Repeats this `STM` effect while its result satisfies the specified
predicate.

**WARNING**: `repeatWhile` uses a busy loop to repeat the effect and will
consume a thread until it completes (it cannot yield). This is because STM
describes a single atomic transaction which must either complete, retry or
fail a transaction before yielding back to the Effect runtime.

- Use `retryWhile` instead if you don't need to maintain transaction
  state for repeats.
- Ensure repeating the STM effect will eventually not satisfy the
  predicate.

**Signature**

```ts
export declare const repeatWhile: {
  <A>(predicate: Predicate<A>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A>(self: STM<R, E, A>, predicate: Predicate<A>): STM<R, E, A>
}
```

Added in v2.0.0

## retryUntil

Filters the value produced by this effect, retrying the transaction until
the predicate returns `true` for the value.

**Signature**

```ts
export declare const retryUntil: {
  <A>(predicate: Predicate<A>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A>(self: STM<R, E, A>, predicate: Predicate<A>): STM<R, E, A>
}
```

Added in v2.0.0

## retryWhile

Filters the value produced by this effect, retrying the transaction while
the predicate returns `true` for the value.

**Signature**

```ts
export declare const retryWhile: {
  <A>(predicate: Predicate<A>): <R, E>(self: STM<R, E, A>) => STM<R, E, A>
  <R, E, A>(self: STM<R, E, A>, predicate: Predicate<A>): STM<R, E, A>
}
```

Added in v2.0.0

## summarized

Summarizes a `STM` effect by computing a provided value before and after
execution, and then combining the values to produce a summary, together
with the result of execution.

**Signature**

```ts
export declare const summarized: {
  <R2, E2, A2, A3>(summary: STM<R2, E2, A2>, f: (before: A2, after: A2) => A3): <R, E, A>(
    self: STM<R, E, A>
  ) => STM<R2 | R, E2 | E, readonly [A3, A]>
  <R, E, A, R2, E2, A2, A3>(self: STM<R, E, A>, summary: STM<R2, E2, A2>, f: (before: A2, after: A2) => A3): STM<
    R | R2,
    E | E2,
    readonly [A3, A]
  >
}
```

Added in v2.0.0

## unless

The moral equivalent of `if (!p) exp`

**Signature**

```ts
export declare const unless: {
  (predicate: LazyArg<boolean>): <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>>
  <R, E, A>(self: STM<R, E, A>, predicate: LazyArg<boolean>): STM<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## unlessSTM

The moral equivalent of `if (!p) exp` when `p` has side-effects

**Signature**

```ts
export declare const unlessSTM: {
  <R2, E2>(predicate: STM<R2, E2, boolean>): <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, Option.Option<A>>
  <R, E, A, R2, E2>(self: STM<R, E, A>, predicate: STM<R2, E2, boolean>): STM<R | R2, E | E2, Option.Option<A>>
}
```

Added in v2.0.0

## validateAll

Feeds elements of type `A` to `f` and accumulates all errors in error
channel or successes in success channel.

This combinator is lossy meaning that if there are errors all successes
will be lost. To retain all information please use `STM.partition`.

**Signature**

```ts
export declare const validateAll: {
  <R, E, A, B>(f: (a: A) => STM<R, E, B>): (elements: Iterable<A>) => STM<R, [E, ...E[]], B[]>
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => STM<R, E, B>): STM<R, [E, ...E[]], B[]>
}
```

Added in v2.0.0

## validateFirst

Feeds elements of type `A` to `f` until it succeeds. Returns first success
or the accumulation of all errors.

**Signature**

```ts
export declare const validateFirst: {
  <R, E, A, B>(f: (a: A) => STM<R, E, B>): (elements: Iterable<A>) => STM<R, E[], B>
  <R, E, A, B>(elements: Iterable<A>, f: (a: A) => STM<R, E, B>): STM<R, E[], B>
}
```

Added in v2.0.0

## when

The moral equivalent of `if (p) exp`.

**Signature**

```ts
export declare const when: {
  (predicate: LazyArg<boolean>): <R, E, A>(self: STM<R, E, A>) => STM<R, E, Option.Option<A>>
  <R, E, A>(self: STM<R, E, A>, predicate: LazyArg<boolean>): STM<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## whenSTM

The moral equivalent of `if (p) exp` when `p` has side-effects.

**Signature**

```ts
export declare const whenSTM: {
  <R2, E2>(predicate: STM<R2, E2, boolean>): <R, E, A>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, Option.Option<A>>
  <R, E, A, R2, E2>(self: STM<R, E, A>, predicate: STM<R2, E2, boolean>): STM<R | R2, E | E2, Option.Option<A>>
}
```

Added in v2.0.0

# refinements

## isSTM

Returns `true` if the provided value is an `STM`, `false` otherwise.

**Signature**

```ts
export declare const isSTM: (u: unknown) => u is STM<unknown, unknown, unknown>
```

Added in v2.0.0

# sequencing

## flatMap

Feeds the value produced by this effect to the specified function, and then
runs the returned effect as well to produce its results.

**Signature**

```ts
export declare const flatMap: {
  <A, R1, E1, A2>(f: (a: A) => STM<R1, E1, A2>): <R, E>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A2>
  <R, E, A, R1, E1, A2>(self: STM<R, E, A>, f: (a: A) => STM<R1, E1, A2>): STM<R | R1, E | E1, A2>
}
```

Added in v2.0.0

## flatten

Flattens out a nested `STM` effect.

**Signature**

```ts
export declare const flatten: <R, E, R2, E2, A>(self: STM<R, E, STM<R2, E2, A>>) => STM<R | R2, E | E2, A>
```

Added in v2.0.0

## tap

"Peeks" at the success of transactional effect.

**Signature**

```ts
export declare const tap: {
  <A, X extends A, R2, E2, _>(f: (a: X) => STM<R2, E2, _>): <R, E>(self: STM<R, E, A>) => STM<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2, _>(self: STM<R, E, A>, f: (a: X) => STM<R2, E2, _>): STM<R | R2, E | E2, A>
}
```

Added in v2.0.0

## tapBoth

"Peeks" at both sides of an transactional effect.

**Signature**

```ts
export declare const tapBoth: {
  <E, XE extends E, R2, E2, A2, A, XA extends A, R3, E3, A3>(options: {
    readonly onFailure: (error: XE) => STM<R2, E2, A2>
    readonly onSuccess: (value: XA) => STM<R3, E3, A3>
  }): <R>(self: STM<R, E, A>) => STM<R2 | R3 | R, E | E2 | E3, A>
  <R, E, XE extends E, R2, E2, A2, A, XA extends A, R3, E3, A3>(
    self: STM<R, E, A>,
    options: { readonly onFailure: (error: XE) => STM<R2, E2, A2>; readonly onSuccess: (value: XA) => STM<R3, E3, A3> }
  ): STM<R | R2 | R3, E | E2 | E3, A>
}
```

Added in v2.0.0

## tapError

"Peeks" at the error of the transactional effect.

**Signature**

```ts
export declare const tapError: {
  <E, X extends E, R2, E2, _>(f: (error: X) => STM<R2, E2, _>): <R, A>(self: STM<R, E, A>) => STM<R2 | R, E | E2, A>
  <R, A, E, X extends E, R2, E2, _>(self: STM<R, E, A>, f: (error: X) => STM<R2, E2, _>): STM<R | R2, E | E2, A>
}
```

Added in v2.0.0

# symbols

## STMTypeId

**Signature**

```ts
export declare const STMTypeId: typeof STMTypeId
```

Added in v2.0.0

## STMTypeId (type alias)

**Signature**

```ts
export type STMTypeId = typeof STMTypeId
```

Added in v2.0.0

# traversing

## forEach

Applies the function `f` to each element of the `Iterable<A>` and returns
a transactional effect that produces a new `Chunk<A2>`.

**Signature**

```ts
export declare const forEach: {
  <A, R, E, A2>(f: (a: A) => STM<R, E, A2>, options?: { readonly discard?: false }): (
    elements: Iterable<A>
  ) => STM<R, E, A2[]>
  <A, R, E, A2>(f: (a: A) => STM<R, E, A2>, options: { readonly discard: true }): (
    elements: Iterable<A>
  ) => STM<R, E, void>
  <A, R, E, A2>(elements: Iterable<A>, f: (a: A) => STM<R, E, A2>, options?: { readonly discard?: false }): STM<
    R,
    E,
    A2[]
  >
  <A, R, E, A2>(elements: Iterable<A>, f: (a: A) => STM<R, E, A2>, options: { readonly discard: true }): STM<R, E, void>
}
```

Added in v2.0.0

## partition

Feeds elements of type `A` to a function `f` that returns an effect.
Collects all successes and failures in a tupled fashion.

**Signature**

```ts
export declare const partition: {
  <R, E, A, A2>(f: (a: A) => STM<R, E, A2>): (elements: Iterable<A>) => STM<R, never, readonly [E[], A2[]]>
  <R, E, A, A2>(elements: Iterable<A>, f: (a: A) => STM<R, E, A2>): STM<R, never, readonly [E[], A2[]]>
}
```

Added in v2.0.0

# type lambdas

## STMTypeLambda (interface)

**Signature**

```ts
export interface STMTypeLambda extends TypeLambda {
  readonly type: STM<this['Out2'], this['Out1'], this['Target']>
}
```

Added in v2.0.0

# utils

## All (namespace)

Added in v2.0.0

### Signature (interface)

**Signature**

```ts
export interface Signature {
  <Arg extends ReadonlyArray<STMAny> | Iterable<STMAny> | Record<string, STMAny>, O extends Options>(
    arg: Narrow<Arg>,
    options?: O
  ): [Arg] extends [ReadonlyArray<STMAny>]
    ? ReturnTuple<Arg, IsDiscard<O>>
    : [Arg] extends [Iterable<STMAny>]
    ? ReturnIterable<Arg, IsDiscard<O>>
    : [Arg] extends [Record<string, STMAny>]
    ? ReturnObject<Arg, IsDiscard<O>>
    : never
}
```

Added in v2.0.0

### Options (type alias)

**Signature**

```ts
export type Options = { readonly discard?: boolean }
```

Added in v2.0.0

## STM (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<R, E, A> {
  readonly [STMTypeId]: {
    readonly _R: (_: never) => R
    readonly _E: (_: never) => E
    readonly _A: (_: never) => A
  }
}
```

Added in v2.0.0

# zipping

## zip

Sequentially zips this value with the specified one.

**Signature**

```ts
export declare const zip: {
  <R1, E1, A1>(that: STM<R1, E1, A1>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, readonly [A, A1]>
  <R, E, A, R1, E1, A1>(self: STM<R, E, A>, that: STM<R1, E1, A1>): STM<R | R1, E | E1, readonly [A, A1]>
}
```

Added in v2.0.0

## zipLeft

Sequentially zips this value with the specified one, discarding the second
element of the tuple.

**Signature**

```ts
export declare const zipLeft: {
  <R1, E1, A1>(that: STM<R1, E1, A1>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A>
  <R, E, A, R1, E1, A1>(self: STM<R, E, A>, that: STM<R1, E1, A1>): STM<R | R1, E | E1, A>
}
```

Added in v2.0.0

## zipRight

Sequentially zips this value with the specified one, discarding the first
element of the tuple.

**Signature**

```ts
export declare const zipRight: {
  <R1, E1, A1>(that: STM<R1, E1, A1>): <R, E, A>(self: STM<R, E, A>) => STM<R1 | R, E1 | E, A1>
  <R, E, A, R1, E1, A1>(self: STM<R, E, A>, that: STM<R1, E1, A1>): STM<R | R1, E | E1, A1>
}
```

Added in v2.0.0

## zipWith

Sequentially zips this value with the specified one, combining the values
using the specified combiner function.

**Signature**

```ts
export declare const zipWith: {
  <R1, E1, A1, A, A2>(that: STM<R1, E1, A1>, f: (a: A, b: A1) => A2): <R, E>(
    self: STM<R, E, A>
  ) => STM<R1 | R, E1 | E, A2>
  <R, E, R1, E1, A1, A, A2>(self: STM<R, E, A>, that: STM<R1, E1, A1>, f: (a: A, b: A1) => A2): STM<R | R1, E | E1, A2>
}
```

Added in v2.0.0
