---
title: Effect.ts
nav_order: 29
parent: Modules
---

## Effect overview

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [alternatives](#alternatives)
  - [orDie](#ordie)
  - [orDieWith](#ordiewith)
  - [orElse](#orelse)
  - [orElseFail](#orelsefail)
  - [orElseSucceed](#orelsesucceed)
- [caching](#caching)
  - [cached](#cached)
  - [cachedFunction](#cachedfunction)
  - [cachedInvalidateWithTTL](#cachedinvalidatewithttl)
  - [cachedWithTTL](#cachedwithttl)
  - [once](#once)
- [clock](#clock)
  - [clock](#clock-1)
  - [clockWith](#clockwith)
  - [withClock](#withclock)
- [collecting & elements](#collecting--elements)
  - [all](#all)
  - [allSuccesses](#allsuccesses)
  - [allWith](#allwith)
  - [dropUntil](#dropuntil)
  - [dropWhile](#dropwhile)
  - [every](#every)
  - [exists](#exists)
  - [filter](#filter)
  - [findFirst](#findfirst)
  - [firstSuccessOf](#firstsuccessof)
  - [forEach](#foreach)
  - [head](#head)
  - [mergeAll](#mergeall)
  - [partition](#partition)
  - [reduce](#reduce)
  - [reduceEffect](#reduceeffect)
  - [reduceRight](#reduceright)
  - [reduceWhile](#reducewhile)
  - [replicate](#replicate)
  - [replicateEffect](#replicateeffect)
  - [takeUntil](#takeuntil)
  - [takeWhile](#takewhile)
  - [validateAll](#validateall)
  - [validateFirst](#validatefirst)
- [combining](#combining)
  - [ap](#ap)
- [config](#config)
  - [config](#config-1)
  - [configProviderWith](#configproviderwith)
  - [withConfigProvider](#withconfigprovider)
  - [withConfigProviderScoped](#withconfigproviderscoped)
- [constructors](#constructors)
  - [async](#async)
  - [asyncEffect](#asynceffect)
  - [asyncEither](#asynceither)
  - [asyncOption](#asyncoption)
  - [die](#die)
  - [dieMessage](#diemessage)
  - [dieSync](#diesync)
  - [fail](#fail)
  - [failCause](#failcause)
  - [failCauseSync](#failcausesync)
  - [failSync](#failsync)
  - [gen](#gen)
  - [never](#never)
  - [none](#none)
  - [promise](#promise)
  - [succeed](#succeed)
  - [succeedNone](#succeednone)
  - [succeedSome](#succeedsome)
  - [suspend](#suspend)
  - [sync](#sync)
  - [unit](#unit)
  - [withClockScoped](#withclockscoped)
  - [yieldNow](#yieldnow)
- [context](#context)
  - [context](#context-1)
  - [contextWith](#contextwith)
  - [contextWithEffect](#contextwitheffect)
  - [mapInputContext](#mapinputcontext)
  - [provide](#provide)
  - [provideService](#provideservice)
  - [provideServiceEffect](#provideserviceeffect)
  - [serviceConstants](#serviceconstants)
  - [serviceFunction](#servicefunction)
  - [serviceFunctionEffect](#servicefunctioneffect)
  - [serviceFunctions](#servicefunctions)
  - [serviceMembers](#servicemembers)
  - [serviceOption](#serviceoption)
  - [updateService](#updateservice)
- [conversions](#conversions)
  - [either](#either)
  - [exit](#exit)
  - [intoDeferred](#intodeferred)
  - [option](#option)
- [delays & timeouts](#delays--timeouts)
  - [delay](#delay)
  - [sleep](#sleep)
  - [timed](#timed)
  - [timedWith](#timedwith)
  - [timeout](#timeout)
  - [timeoutFail](#timeoutfail)
  - [timeoutFailCause](#timeoutfailcause)
  - [timeoutTo](#timeoutto)
- [do notation](#do-notation)
  - [Do](#do)
  - [bind](#bind)
  - [bindTo](#bindto)
  - [let](#let)
- [error handling](#error-handling)
  - [catch](#catch)
  - [catchAll](#catchall)
  - [catchAllCause](#catchallcause)
  - [catchAllDefect](#catchalldefect)
  - [catchIf](#catchif)
  - [catchSome](#catchsome)
  - [catchSomeCause](#catchsomecause)
  - [catchSomeDefect](#catchsomedefect)
  - [catchTag](#catchtag)
  - [catchTags](#catchtags)
  - [cause](#cause)
  - [eventually](#eventually)
  - [ignore](#ignore)
  - [ignoreLogged](#ignorelogged)
  - [parallelErrors](#parallelerrors)
  - [retry](#retry)
  - [retryN](#retryn)
  - [retryOrElse](#retryorelse)
  - [retryUntil](#retryuntil)
  - [retryUntilEffect](#retryuntileffect)
  - [retryWhile](#retrywhile)
  - [retryWhileEffect](#retrywhileeffect)
  - [sandbox](#sandbox)
  - [try](#try)
  - [tryMap](#trymap)
  - [tryMapPromise](#trymappromise)
  - [tryPromise](#trypromise)
  - [unsandbox](#unsandbox)
- [execution](#execution)
  - [runCallback](#runcallback)
  - [runFork](#runfork)
  - [runPromise](#runpromise)
  - [runPromiseExit](#runpromiseexit)
  - [runSync](#runsync)
  - [runSyncExit](#runsyncexit)
- [fiber refs](#fiber-refs)
  - [getFiberRefs](#getfiberrefs)
  - [inheritFiberRefs](#inheritfiberrefs)
  - [locally](#locally)
  - [locallyScoped](#locallyscoped)
  - [locallyScopedWith](#locallyscopedwith)
  - [locallyWith](#locallywith)
  - [patchFiberRefs](#patchfiberrefs)
  - [setFiberRefs](#setfiberrefs)
  - [updateFiberRefs](#updatefiberrefs)
- [filtering & conditionals](#filtering--conditionals)
  - [filterOrDie](#filterordie)
  - [filterOrDieMessage](#filterordiemessage)
  - [filterOrElse](#filterorelse)
  - [filterOrFail](#filterorfail)
  - [if](#if)
  - [unless](#unless)
  - [unlessEffect](#unlesseffect)
  - [when](#when)
  - [whenEffect](#wheneffect)
  - [whenFiberRef](#whenfiberref)
  - [whenRef](#whenref)
- [getters & folding](#getters--folding)
  - [isFailure](#isfailure)
  - [isSuccess](#issuccess)
  - [match](#match)
  - [matchCause](#matchcause)
  - [matchCauseEffect](#matchcauseeffect)
  - [matchEffect](#matcheffect)
- [interruption](#interruption)
  - [allowInterrupt](#allowinterrupt)
  - [checkInterruptible](#checkinterruptible)
  - [disconnect](#disconnect)
  - [interrupt](#interrupt)
  - [interruptWith](#interruptwith)
  - [interruptible](#interruptible)
  - [interruptibleMask](#interruptiblemask)
  - [onInterrupt](#oninterrupt)
  - [uninterruptible](#uninterruptible)
  - [uninterruptibleMask](#uninterruptiblemask)
- [logging](#logging)
  - [annotateLogs](#annotatelogs)
  - [log](#log)
  - [logAnnotations](#logannotations)
  - [logDebug](#logdebug)
  - [logError](#logerror)
  - [logFatal](#logfatal)
  - [logInfo](#loginfo)
  - [logTrace](#logtrace)
  - [logWarning](#logwarning)
  - [withLogSpan](#withlogspan)
  - [withUnhandledErrorLogLevel](#withunhandlederrorloglevel)
- [mapping](#mapping)
  - [as](#as)
  - [asSome](#assome)
  - [asSomeError](#assomeerror)
  - [asUnit](#asunit)
  - [flip](#flip)
  - [flipWith](#flipwith)
  - [map](#map)
  - [mapAccum](#mapaccum)
  - [mapBoth](#mapboth)
  - [mapError](#maperror)
  - [mapErrorCause](#maperrorcause)
  - [merge](#merge)
  - [negate](#negate)
- [metrics](#metrics)
  - [labelMetrics](#labelmetrics)
  - [labelMetricsScoped](#labelmetricsscoped)
  - [labelMetricsScopedSet](#labelmetricsscopedset)
  - [labelMetricsSet](#labelmetricsset)
  - [metricLabels](#metriclabels)
  - [tagMetrics](#tagmetrics)
  - [tagMetricsScoped](#tagmetricsscoped)
  - [withMetric](#withmetric)
- [models](#models)
  - [Adapter (interface)](#adapter-interface)
  - [Blocked (interface)](#blocked-interface)
  - [Effect (interface)](#effect-interface)
  - [EffectGen (interface)](#effectgen-interface)
  - [EffectUnify (interface)](#effectunify-interface)
  - [EffectUnifyBlacklist (interface)](#effectunifyblacklist-interface)
- [optionality](#optionality)
  - [fromNullable](#fromnullable)
  - [optionFromOptional](#optionfromoptional)
- [random](#random)
  - [random](#random-1)
  - [randomWith](#randomwith)
- [refinements](#refinements)
  - [isEffect](#iseffect)
- [repetition / recursion](#repetition--recursion)
  - [forever](#forever)
  - [iterate](#iterate)
  - [loop](#loop)
  - [repeat](#repeat)
  - [repeatN](#repeatn)
  - [repeatOrElse](#repeatorelse)
  - [repeatUntil](#repeatuntil)
  - [repeatUntilEffect](#repeatuntileffect)
  - [repeatWhile](#repeatwhile)
  - [repeatWhileEffect](#repeatwhileeffect)
  - [schedule](#schedule)
  - [scheduleForked](#scheduleforked)
  - [scheduleFrom](#schedulefrom)
  - [whileLoop](#whileloop)
- [requests & batching](#requests--batching)
  - [blocked](#blocked)
  - [cacheRequestResult](#cacherequestresult)
  - [flatMapStep](#flatmapstep)
  - [request](#request)
  - [runRequestBlock](#runrequestblock)
  - [step](#step)
  - [withRequestBatching](#withrequestbatching)
  - [withRequestCache](#withrequestcache)
  - [withRequestCaching](#withrequestcaching)
- [runtime](#runtime)
  - [getRuntimeFlags](#getruntimeflags)
  - [patchRuntimeFlags](#patchruntimeflags)
  - [runtime](#runtime-1)
  - [withRuntimeFlagsPatch](#withruntimeflagspatch)
  - [withRuntimeFlagsPatchScoped](#withruntimeflagspatchscoped)
- [scheduler](#scheduler)
  - [withScheduler](#withscheduler)
- [scoping, resources & finalization](#scoping-resources--finalization)
  - [acquireRelease](#acquirerelease)
  - [acquireReleaseInterruptible](#acquirereleaseinterruptible)
  - [acquireUseRelease](#acquireuserelease)
  - [addFinalizer](#addfinalizer)
  - [ensuring](#ensuring)
  - [finalizersMask](#finalizersmask)
  - [onError](#onerror)
  - [onExit](#onexit)
  - [parallelFinalizers](#parallelfinalizers)
  - [scope](#scope)
  - [scopeWith](#scopewith)
  - [scoped](#scoped)
  - [sequentialFinalizers](#sequentialfinalizers)
  - [using](#using)
  - [withEarlyRelease](#withearlyrelease)
- [semaphore](#semaphore)
  - [Permit (interface)](#permit-interface)
  - [Semaphore (interface)](#semaphore-interface)
  - [makeSemaphore](#makesemaphore)
  - [unsafeMakeSemaphore](#unsafemakesemaphore)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
  - [race](#race)
  - [raceAll](#raceall)
  - [raceFirst](#racefirst)
  - [raceWith](#racewith)
  - [summarized](#summarized)
  - [tap](#tap)
  - [tapBoth](#tapboth)
  - [tapDefect](#tapdefect)
  - [tapError](#taperror)
  - [tapErrorCause](#taperrorcause)
  - [tapErrorTag](#taperrortag)
- [supervision & fibers](#supervision--fibers)
  - [awaitAllChildren](#awaitallchildren)
  - [daemonChildren](#daemonchildren)
  - [descriptor](#descriptor)
  - [descriptorWith](#descriptorwith)
  - [diffFiberRefs](#difffiberrefs)
  - [ensuringChild](#ensuringchild)
  - [ensuringChildren](#ensuringchildren)
  - [fiberId](#fiberid)
  - [fiberIdWith](#fiberidwith)
  - [fork](#fork)
  - [forkAll](#forkall)
  - [forkDaemon](#forkdaemon)
  - [forkIn](#forkin)
  - [forkScoped](#forkscoped)
  - [forkWithErrorHandler](#forkwitherrorhandler)
  - [fromFiber](#fromfiber)
  - [fromFiberEffect](#fromfibereffect)
  - [supervised](#supervised)
  - [transplant](#transplant)
  - [withConcurrency](#withconcurrency)
- [symbols](#symbols)
  - [EffectTypeId](#effecttypeid)
  - [EffectTypeId (type alias)](#effecttypeid-type-alias)
- [tracing](#tracing)
  - [annotateCurrentSpan](#annotatecurrentspan)
  - [annotateSpans](#annotatespans)
  - [currentParentSpan](#currentparentspan)
  - [currentSpan](#currentspan)
  - [linkSpans](#linkspans)
  - [makeSpan](#makespan)
  - [makeSpanScoped](#makespanscoped)
  - [spanAnnotations](#spanannotations)
  - [spanLinks](#spanlinks)
  - [tracer](#tracer)
  - [tracerWith](#tracerwith)
  - [useSpan](#usespan)
  - [withParentSpan](#withparentspan)
  - [withSpan](#withspan)
  - [withSpanScoped](#withspanscoped)
  - [withTracer](#withtracer)
  - [withTracerScoped](#withtracerscoped)
  - [withTracerTiming](#withtracertiming)
- [type lambdas](#type-lambdas)
  - [EffectTypeLambda (interface)](#effecttypelambda-interface)
- [unify](#unify)
  - [unified](#unified)
  - [unifiedFn](#unifiedfn)
- [utils](#utils)
  - [All (namespace)](#all-namespace)
    - [EffectAny (type alias)](#effectany-type-alias)
    - [ExtractMode (type alias)](#extractmode-type-alias)
    - [IsDiscard (type alias)](#isdiscard-type-alias)
    - [Return (type alias)](#return-type-alias)
    - [ReturnIterable (type alias)](#returniterable-type-alias)
    - [ReturnObject (type alias)](#returnobject-type-alias)
    - [ReturnTuple (type alias)](#returntuple-type-alias)
  - [Effect (namespace)](#effect-namespace)
    - [Variance (interface)](#variance-interface)
    - [VarianceStruct (interface)](#variancestruct-interface)
    - [Context (type alias)](#context-type-alias)
    - [Error (type alias)](#error-type-alias)
    - [Success (type alias)](#success-type-alias)
    - [Unify (type alias)](#unify-type-alias)
  - [MergeRecord (type alias)](#mergerecord-type-alias)
  - [withMaxOpsBeforeYield](#withmaxopsbeforeyield)
  - [withSchedulingPriority](#withschedulingpriority)
- [zipping](#zipping)
  - [validate](#validate)
  - [validateWith](#validatewith)
  - [zip](#zip)
  - [zipLeft](#zipleft)
  - [zipRight](#zipright)
  - [zipWith](#zipwith)

---

# alternatives

## orDie

Translates effect failure into death of the fiber, making all failures
unchecked and not a part of the type of the effect.

**Signature**

```ts
export declare const orDie: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A>
```

Added in v2.0.0

## orDieWith

Keeps none of the errors, and terminates the fiber with them, using the
specified function to convert the `E` into a `Throwable`.

**Signature**

```ts
export declare const orDieWith: {
  <E>(f: (error: E) => unknown): <R, A>(self: Effect<R, E, A>) => Effect<R, never, A>
  <R, E, A>(self: Effect<R, E, A>, f: (error: E) => unknown): Effect<R, never, A>
}
```

Added in v2.0.0

## orElse

Executes this effect and returns its value, if it succeeds, but otherwise
executes the specified effect.

**Signature**

```ts
export declare const orElse: {
  <R2, E2, A2>(that: LazyArg<Effect<R2, E2, A2>>): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, that: LazyArg<Effect<R2, E2, A2>>): Effect<R | R2, E2, A | A2>
}
```

Added in v2.0.0

## orElseFail

Executes this effect and returns its value, if it succeeds, but otherwise
fails with the specified error.

**Signature**

```ts
export declare const orElseFail: {
  <E2>(evaluate: LazyArg<E2>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E2, A>
  <R, E, A, E2>(self: Effect<R, E, A>, evaluate: LazyArg<E2>): Effect<R, E2, A>
}
```

Added in v2.0.0

## orElseSucceed

Executes this effect and returns its value, if it succeeds, but
otherwise succeeds with the specified value.

**Signature**

```ts
export declare const orElseSucceed: {
  <A2>(evaluate: LazyArg<A2>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A2 | A>
  <R, E, A, A2>(self: Effect<R, E, A>, evaluate: LazyArg<A2>): Effect<R, never, A | A2>
}
```

Added in v2.0.0

# caching

## cached

Returns an effect that, if evaluated, will return the lazily computed
result of this effect.

**Signature**

```ts
export declare const cached: <R, E, A>(self: Effect<R, E, A>) => Effect<never, never, Effect<R, E, A>>
```

Added in v2.0.0

## cachedFunction

Returns a memoized version of the specified effectual function.

**Signature**

```ts
export declare const cachedFunction: <R, E, A, B>(
  f: (a: A) => Effect<R, E, B>,
  eq?: Equivalence<A> | undefined
) => Effect<never, never, (a: A) => Effect<R, E, B>>
```

Added in v2.0.0

## cachedInvalidateWithTTL

Returns an effect that, if evaluated, will return the cached result of this
effect. Cached results will expire after `timeToLive` duration. In
addition, returns an effect that can be used to invalidate the current
cached value before the `timeToLive` duration expires.

**Signature**

```ts
export declare const cachedInvalidateWithTTL: {
  (timeToLive: Duration.DurationInput): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R, never, [Effect<never, E, A>, Effect<never, never, void>]>
  <R, E, A>(self: Effect<R, E, A>, timeToLive: Duration.DurationInput): Effect<
    R,
    never,
    [Effect<never, E, A>, Effect<never, never, void>]
  >
}
```

Added in v2.0.0

## cachedWithTTL

Returns an effect that, if evaluated, will return the cached result of this
effect. Cached results will expire after `timeToLive` duration.

**Signature**

```ts
export declare const cachedWithTTL: {
  (timeToLive: Duration.DurationInput): <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Effect<never, E, A>>
  <R, E, A>(self: Effect<R, E, A>, timeToLive: Duration.DurationInput): Effect<R, never, Effect<never, E, A>>
}
```

Added in v2.0.0

## once

Returns an effect that will be executed at most once, even if it is
evaluated multiple times.

**Signature**

```ts
export declare const once: <R, E, A>(self: Effect<R, E, A>) => Effect<never, never, Effect<R, E, void>>
```

Added in v2.0.0

# clock

## clock

Retreives the `Clock` service from the context

**Signature**

```ts
export declare const clock: Effect<never, never, Clock.Clock>
```

Added in v2.0.0

## clockWith

Retreives the `Clock` service from the context and provides it to the
specified effectful function.

**Signature**

```ts
export declare const clockWith: <R, E, A>(f: (clock: Clock.Clock) => Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## withClock

Executes the specified workflow with the specified implementation of the
clock service.

**Signature**

```ts
export declare const withClock: {
  <A extends Clock.Clock>(value: A): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A extends Clock.Clock>(effect: Effect<R, E, A>, value: A): Effect<R, E, A>
}
```

Added in v2.0.0

# collecting & elements

## all

Runs all the provided effects in sequence respecting the structure provided in input.

Supports multiple arguments, a single argument tuple / array or record / struct.

**Signature**

```ts
export declare const all: <
  const Arg extends Iterable<Effect<any, any, any>> | Record<string, Effect<any, any, any>>,
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | 'inherit' | undefined
    readonly discard?: boolean | undefined
    readonly mode?: 'either' | 'default' | 'validate' | undefined
  }
>(
  arg: Arg,
  options?: O | undefined
) => All.Return<Arg, O>
```

Added in v2.0.0

## allSuccesses

Evaluate and run each effect in the structure and collect the results,
discarding results from failed effects.

**Signature**

```ts
export declare const allSuccesses: <R, E, A>(
  elements: Iterable<Effect<R, E, A>>,
  options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
) => Effect<R, never, A[]>
```

Added in v2.0.0

## allWith

Data-last variant of `Effect.all`.

Runs all the provided effects in sequence respecting the structure provided in input.

Supports multiple arguments, a single argument tuple / array or record / struct.

**Signature**

```ts
export declare const allWith: <
  O extends {
    readonly concurrency?: Concurrency | undefined
    readonly batching?: boolean | 'inherit' | undefined
    readonly discard?: boolean | undefined
    readonly mode?: 'either' | 'default' | 'validate' | undefined
  }
>(
  options?: O | undefined
) => <const Arg extends Iterable<Effect<any, any, any>> | Record<string, Effect<any, any, any>>>(
  arg: Arg
) => All.Return<Arg, O>
```

Added in v2.0.0

## dropUntil

Drops all elements until the effectful predicate returns true.

**Signature**

```ts
export declare const dropUntil: {
  <A, R, E>(predicate: (a: A, i: number) => Effect<R, E, boolean>): (elements: Iterable<A>) => Effect<R, E, A[]>
  <A, R, E>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, A[]>
}
```

Added in v2.0.0

## dropWhile

Drops all elements so long as the predicate returns true.

**Signature**

```ts
export declare const dropWhile: {
  <R, E, A>(f: (a: A, i: number) => Effect<R, E, boolean>): (elements: Iterable<A>) => Effect<R, E, A[]>
  <R, E, A>(elements: Iterable<A>, f: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, A[]>
}
```

Added in v2.0.0

## every

Determines whether all elements of the `Collection<A>` satisfies the effectual
predicate `f`.

**Signature**

```ts
export declare const every: {
  <R, E, A>(f: (a: A, i: number) => Effect<R, E, boolean>): (elements: Iterable<A>) => Effect<R, E, boolean>
  <R, E, A>(elements: Iterable<A>, f: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, boolean>
}
```

Added in v2.0.0

## exists

Determines whether any element of the `Iterable<A>` satisfies the effectual
predicate `f`.

**Signature**

```ts
export declare const exists: {
  <R, E, A>(
    f: (a: A, i: number) => Effect<R, E, boolean>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): (elements: Iterable<A>) => Effect<R, E, boolean>
  <R, E, A>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, boolean>,
    options?: { readonly concurrency: Concurrency; readonly batching?: boolean | 'inherit' }
  ): Effect<R, E, boolean>
}
```

Added in v2.0.0

## filter

Filters the collection using the specified effectful predicate.

**Signature**

```ts
export declare const filter: {
  <A, R, E>(
    f: (a: A, i: number) => Effect<R, E, boolean>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly negate?: boolean }
  ): (elements: Iterable<A>) => Effect<R, E, A[]>
  <A, R, E>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, boolean>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly negate?: boolean }
  ): Effect<R, E, A[]>
}
```

Added in v2.0.0

## findFirst

Returns the first element that satisfies the effectful predicate.

**Signature**

```ts
export declare const findFirst: {
  <A, R, E>(f: (a: A, i: number) => Effect<R, E, boolean>): (elements: Iterable<A>) => Effect<R, E, Option.Option<A>>
  <A, R, E>(elements: Iterable<A>, f: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## firstSuccessOf

This function takes an iterable of `Effect` values and returns a new
`Effect` value that represents the first `Effect` value in the iterable
that succeeds. If all of the `Effect` values in the iterable fail, then
the resulting `Effect` value will fail as well.

This function is sequential, meaning that the `Effect` values in the
iterable will be executed in sequence, and the first one that succeeds
will determine the outcome of the resulting `Effect` value.

**Signature**

```ts
export declare const firstSuccessOf: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, A>
```

Added in v2.0.0

## forEach

**Signature**

```ts
export declare const forEach: {
  <A, R, E, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard?: false }
  ): (self: Iterable<A>) => Effect<R, E, B[]>
  <A, R, E, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard: true }
  ): (self: Iterable<A>) => Effect<R, E, void>
  <A, R, E, B>(
    self: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard?: false }
  ): Effect<R, E, B[]>
  <A, R, E, B>(
    self: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard: true }
  ): Effect<R, E, void>
}
```

Added in v2.0.0

## head

Returns a successful effect with the head of the collection if the collection
is non-empty, or fails with the error `None` if the collection is empty.

**Signature**

```ts
export declare const head: <R, E, A>(self: Effect<R, E, Iterable<A>>) => Effect<R, Option.Option<E>, A>
```

Added in v2.0.0

## mergeAll

Merges an `Iterable<Effect<R, E, A>>` to a single effect, working
sequentially.

**Signature**

```ts
export declare const mergeAll: {
  <Z, A>(
    zero: Z,
    f: (z: Z, a: A, i: number) => Z,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): <R, E>(elements: Iterable<Effect<R, E, A>>) => Effect<R, E, Z>
  <R, E, A, Z>(
    elements: Iterable<Effect<R, E, A>>,
    zero: Z,
    f: (z: Z, a: A, i: number) => Z,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): Effect<R, E, Z>
}
```

Added in v2.0.0

## partition

Feeds elements of type `A` to a function `f` that returns an effect.
Collects all successes and failures in a tupled fashion.

**Signature**

```ts
export declare const partition: {
  <R, E, A, B>(
    f: (a: A) => Effect<R, E, B>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): (elements: Iterable<A>) => Effect<R, never, readonly [E[], B[]]>
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A) => Effect<R, E, B>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): Effect<R, never, readonly [E[], B[]]>
}
```

Added in v2.0.0

## reduce

Folds an `Iterable<A>` using an effectual function f, working sequentially
from left to right.

**Signature**

```ts
export declare const reduce: {
  <Z, A, R, E>(zero: Z, f: (z: Z, a: A, i: number) => Effect<R, E, Z>): (elements: Iterable<A>) => Effect<R, E, Z>
  <Z, A, R, E>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A, i: number) => Effect<R, E, Z>): Effect<R, E, Z>
}
```

Added in v2.0.0

## reduceEffect

Reduces an `Iterable<Effect<R, E, A>>` to a single effect.

**Signature**

```ts
export declare const reduceEffect: {
  <R, E, A>(
    zero: Effect<R, E, A>,
    f: (acc: A, a: A, i: number) => A,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): (elements: Iterable<Effect<R, E, A>>) => Effect<R, E, A>
  <R, E, A>(
    elements: Iterable<Effect<R, E, A>>,
    zero: Effect<R, E, A>,
    f: (acc: A, a: A, i: number) => A,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): Effect<R, E, A>
}
```

Added in v2.0.0

## reduceRight

Folds an `Iterable<A>` using an effectual function f, working sequentially from left to right.

**Signature**

```ts
export declare const reduceRight: {
  <A, Z, R, E>(zero: Z, f: (a: A, z: Z, i: number) => Effect<R, E, Z>): (elements: Iterable<A>) => Effect<R, E, Z>
  <A, Z, R, E>(elements: Iterable<A>, zero: Z, f: (a: A, z: Z, i: number) => Effect<R, E, Z>): Effect<R, E, Z>
}
```

Added in v2.0.0

## reduceWhile

Folds over the elements in this chunk from the left, stopping the fold early
when the predicate is not satisfied.

**Signature**

```ts
export declare const reduceWhile: {
  <A, R, E, Z>(
    zero: Z,
    options: { readonly while: Predicate<Z>; readonly body: (s: Z, a: A, i: number) => Effect<R, E, Z> }
  ): (elements: Iterable<A>) => Effect<R, E, Z>
  <A, R, E, Z>(
    elements: Iterable<A>,
    zero: Z,
    options: { readonly while: Predicate<Z>; readonly body: (s: Z, a: A, i: number) => Effect<R, E, Z> }
  ): Effect<R, E, Z>
}
```

Added in v2.0.0

## replicate

Replicates the given effect `n` times.

**Signature**

```ts
export declare const replicate: {
  (n: number): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>[]
  <R, E, A>(self: Effect<R, E, A>, n: number): Effect<R, E, A>[]
}
```

Added in v2.0.0

## replicateEffect

Performs this effect the specified number of times and collects the
results.

**Signature**

```ts
export declare const replicateEffect: {
  (
    n: number,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard?: false }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A[]>
  (
    n: number,
    options: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard: true }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, void>
  <R, E, A>(
    self: Effect<R, E, A>,
    n: number,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard?: false }
  ): Effect<R, E, A[]>
  <R, E, A>(
    self: Effect<R, E, A>,
    n: number,
    options: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard: true }
  ): Effect<R, E, void>
}
```

Added in v2.0.0

## takeUntil

Takes elements until the effectual predicate returns true.

**Signature**

```ts
export declare const takeUntil: {
  <R, E, A>(predicate: (a: A, i: number) => Effect<R, E, boolean>): (elements: Iterable<A>) => Effect<R, E, A[]>
  <R, E, A>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, A[]>
}
```

Added in v2.0.0

## takeWhile

Takes all elements so long as the effectual predicate returns true.

**Signature**

```ts
export declare const takeWhile: {
  <R, E, A>(predicate: (a: A, i: number) => Effect<R, E, boolean>): (elements: Iterable<A>) => Effect<R, E, A[]>
  <R, E, A>(elements: Iterable<A>, predicate: (a: A, i: number) => Effect<R, E, boolean>): Effect<R, E, A[]>
}
```

Added in v2.0.0

## validateAll

Feeds elements of type `A` to `f` and accumulates all errors in error
channel or successes in success channel.

This combinator is lossy meaning that if there are errors all successes
will be lost. To retain all information please use `partition`.

**Signature**

```ts
export declare const validateAll: {
  <R, E, A, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard?: false }
  ): (elements: Iterable<A>) => Effect<R, E[], B[]>
  <R, E, A, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard: true }
  ): (elements: Iterable<A>) => Effect<R, E[], void>
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard?: false }
  ): Effect<R, E[], B[]>
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit'; readonly discard: true }
  ): Effect<R, E[], void>
}
```

Added in v2.0.0

## validateFirst

Feeds elements of type `A` to `f` until it succeeds. Returns first success
or the accumulation of all errors.

If `elements` is empty then `Effect.fail([])` is returned.

**Signature**

```ts
export declare const validateFirst: {
  <R, E, A, B>(
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): (elements: Iterable<A>) => Effect<R, E[], B>
  <R, E, A, B>(
    elements: Iterable<A>,
    f: (a: A, i: number) => Effect<R, E, B>,
    options?: { readonly concurrency?: Concurrency; readonly batching?: boolean | 'inherit' }
  ): Effect<R, E[], B>
}
```

**Example**

```ts
import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'

const f = (n: number) => (n > 0 ? Effect.succeed(n) : Effect.fail(`${n} is negative`))

assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([], f)), Exit.fail([]))
assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([1, 2], f)), Exit.succeed(1))
assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([1, -1], f)), Exit.succeed(1))
assert.deepStrictEqual(Effect.runSyncExit(Effect.validateFirst([-1, 2], f)), Exit.succeed(2))
assert.deepStrictEqual(
  Effect.runSyncExit(Effect.validateFirst([-1, -2], f)),
  Exit.fail(['-1 is negative', '-2 is negative'])
)
```

Added in v2.0.0

# combining

## ap

**Signature**

```ts
export declare const ap: {
  <R2, E2, A>(that: Effect<R2, E2, A>): <R, E, B>(self: Effect<R, E, (a: A) => B>) => Effect<R2 | R, E2 | E, B>
  <R, E, A, B, R2, E2>(self: Effect<R, E, (a: A) => B>, that: Effect<R2, E2, A>): Effect<R | R2, E | E2, B>
}
```

Added in v2.0.0

# config

## config

Uses the default config provider to load the specified config, or fail with
an error of type Config.Error.

**Signature**

```ts
export declare const config: <A>(config: Config<A>) => Effect<never, ConfigError, A>
```

Added in v2.0.0

## configProviderWith

Retrieves the default config provider, and passes it to the specified
function, which may return an effect that uses the provider to perform some
work or compute some value.

**Signature**

```ts
export declare const configProviderWith: <R, E, A>(
  f: (configProvider: ConfigProvider) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

## withConfigProvider

Executes the specified workflow with the specified configuration provider.

**Signature**

```ts
export declare const withConfigProvider: {
  (value: ConfigProvider): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, value: ConfigProvider): Effect<R, E, A>
}
```

Added in v2.0.0

## withConfigProviderScoped

Sets the configuration provider to the specified value and restores it to its original value
when the scope is closed.

**Signature**

```ts
export declare const withConfigProviderScoped: (value: ConfigProvider) => Effect<Scope.Scope, never, void>
```

Added in v2.0.0

# constructors

## async

Imports an asynchronous side-effect into a pure `Effect` value.
The callback function `Effect<R, E, A> => void` must be called at most once.

If an Effect is returned by the registration function, it will be executed
if the fiber executing the effect is interrupted.

The registration function can also receive an `AbortSignal` if required for
interruption.

The `FiberId` of the fiber that may complete the async callback may be
provided to allow for better diagnostics.

**Signature**

```ts
export declare const async: <R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void, signal: AbortSignal) => void | Effect<R, never, void>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A>
```

Added in v2.0.0

## asyncEffect

Converts an asynchronous, callback-style API into an `Effect`, which will
be executed asynchronously.

With this variant, the registration function may return a an `Effect`.

**Signature**

```ts
export declare const asyncEffect: <R, E, A, R2, E2, X>(
  register: (callback: (_: Effect<R, E, A>) => void) => Effect<R2, E2, X>
) => Effect<R | R2, E | E2, A>
```

Added in v2.0.0

## asyncEither

Imports an asynchronous side-effect into an effect. It has the option of
returning the value synchronously, which is useful in cases where it cannot
be determined if the effect is synchronous or asynchronous until the register
is actually executed. It also has the option of returning a canceler,
which will be used by the runtime to cancel the asynchronous effect if the fiber
executing the effect is interrupted.

If the register function returns a value synchronously, then the callback
function `Effect<R, E, A> => void` must not be called. Otherwise the callback
function must be called at most once.

The `FiberId` of the fiber that may complete the async callback may be
provided to allow for better diagnostics.

**Signature**

```ts
export declare const asyncEither: <R, E, A>(
  register: (callback: (effect: Effect<R, E, A>) => void) => Either.Either<Effect<R, never, void>, Effect<R, E, A>>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A>
```

Added in v2.0.0

## asyncOption

Imports an asynchronous effect into a pure `Effect` value, possibly returning
the value synchronously.

If the register function returns a value synchronously, then the callback
function `Effect<R, E, A> => void` must not be called. Otherwise the callback
function must be called at most once.

The `FiberId` of the fiber that may complete the async callback may be
provided to allow for better diagnostics.

**Signature**

```ts
export declare const asyncOption: <R, E, A>(
  register: (callback: (_: Effect<R, E, A>) => void) => Option.Option<Effect<R, E, A>>,
  blockingOn?: FiberId.FiberId
) => Effect<R, E, A>
```

Added in v2.0.0

## die

**Signature**

```ts
export declare const die: (defect: unknown) => Effect<never, never, never>
```

Added in v2.0.0

## dieMessage

Returns an effect that dies with a `RuntimeException` having the specified
text message. This method can be used for terminating a fiber because a
defect has been detected in the code.

**Signature**

```ts
export declare const dieMessage: (message: string) => Effect<never, never, never>
```

Added in v2.0.0

## dieSync

**Signature**

```ts
export declare const dieSync: (evaluate: LazyArg<unknown>) => Effect<never, never, never>
```

Added in v2.0.0

## fail

**Signature**

```ts
export declare const fail: <E>(error: E) => Effect<never, E, never>
```

Added in v2.0.0

## failCause

**Signature**

```ts
export declare const failCause: <E>(cause: Cause.Cause<E>) => Effect<never, E, never>
```

Added in v2.0.0

## failCauseSync

**Signature**

```ts
export declare const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Effect<never, E, never>
```

Added in v2.0.0

## failSync

**Signature**

```ts
export declare const failSync: <E>(evaluate: LazyArg<E>) => Effect<never, E, never>
```

Added in v2.0.0

## gen

**Signature**

```ts
export declare const gen: {
  <Eff extends EffectGen<any, any, any>, AEff>(f: (resume: Adapter) => Generator<Eff, AEff, any>): Effect<
    [Eff] extends [never] ? never : [Eff] extends [EffectGen<infer R, any, any>] ? R : never,
    [Eff] extends [never] ? never : [Eff] extends [EffectGen<any, infer E, any>] ? E : never,
    AEff
  >
  <Self, Eff extends EffectGen<any, any, any>, AEff>(
    self: Self,
    f: (this: Self, resume: Adapter) => Generator<Eff, AEff, any>
  ): Effect<
    [Eff] extends [never] ? never : [Eff] extends [EffectGen<infer R, any, any>] ? R : never,
    [Eff] extends [never] ? never : [Eff] extends [EffectGen<any, infer E, any>] ? E : never,
    AEff
  >
}
```

Added in v2.0.0

## never

Returns a effect that will never produce anything. The moral equivalent of
`while(true) {}`, only without the wasted CPU cycles.

**Signature**

```ts
export declare const never: Effect<never, never, never>
```

Added in v2.0.0

## none

Requires the option produced by this value to be `None`.

**Signature**

```ts
export declare const none: <R, E, A>(self: Effect<R, E, Option.Option<A>>) => Effect<R, Option.Option<E>, void>
```

Added in v2.0.0

## promise

Like `tryPromise` but produces a defect in case of errors.

An optional `AbortSignal` can be provided to allow for interruption of the
wrapped Promise api.

**Signature**

```ts
export declare const promise: <A>(evaluate: (signal: AbortSignal) => Promise<A>) => Effect<never, never, A>
```

Added in v2.0.0

## succeed

**Signature**

```ts
export declare const succeed: <A>(value: A) => Effect<never, never, A>
```

Added in v2.0.0

## succeedNone

Returns an effect which succeeds with `None`.

**Signature**

```ts
export declare const succeedNone: Effect<never, never, Option.Option<never>>
```

Added in v2.0.0

## succeedSome

Returns an effect which succeeds with the value wrapped in a `Some`.

**Signature**

```ts
export declare const succeedSome: <A>(value: A) => Effect<never, never, Option.Option<A>>
```

Added in v2.0.0

## suspend

**Signature**

```ts
export declare const suspend: <R, E, A>(effect: LazyArg<Effect<R, E, A>>) => Effect<R, E, A>
```

Added in v2.0.0

## sync

**Signature**

```ts
export declare const sync: <A>(evaluate: LazyArg<A>) => Effect<never, never, A>
```

Added in v2.0.0

## unit

**Signature**

```ts
export declare const unit: Effect<never, never, void>
```

Added in v2.0.0

## withClockScoped

Sets the implementation of the clock service to the specified value and
restores it to its original value when the scope is closed.

**Signature**

```ts
export declare const withClockScoped: <A extends Clock.Clock>(value: A) => Effect<Scope.Scope, never, void>
```

Added in v2.0.0

## yieldNow

**Signature**

```ts
export declare const yieldNow: (options?: { readonly priority?: number }) => Effect<never, never, void>
```

Added in v2.0.0

# context

## context

**Signature**

```ts
export declare const context: <R>() => Effect<R, never, Context.Context<R>>
```

Added in v2.0.0

## contextWith

Accesses the context of the effect.

**Signature**

```ts
export declare const contextWith: <R, A>(f: (context: Context.Context<R>) => A) => Effect<R, never, A>
```

Added in v2.0.0

## contextWithEffect

Effectually accesses the context of the effect.

**Signature**

```ts
export declare const contextWithEffect: <R, R0, E, A>(
  f: (context: Context.Context<R0>) => Effect<R, E, A>
) => Effect<R | R0, E, A>
```

Added in v2.0.0

## mapInputContext

Provides some of the context required to run this effect,
leaving the remainder `R0`.

**Signature**

```ts
export declare const mapInputContext: {
  <R0, R>(f: (context: Context.Context<R0>) => Context.Context<R>): <E, A>(self: Effect<R, E, A>) => Effect<R0, E, A>
  <R0, R, E, A>(self: Effect<R, E, A>, f: (context: Context.Context<R0>) => Context.Context<R>): Effect<R0, E, A>
}
```

Added in v2.0.0

## provide

Splits the context into two parts, providing one part using the
specified layer/context/runtime and leaving the remainder `R0`

**Signature**

```ts
export declare const provide: {
  <R2, E2, A2>(layer: Layer.Layer<R2, E2, A2>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | Exclude<R, A2>, E2 | E, A>
  <R2>(context: Context.Context<R2>): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, R2>, E, A>
  <R2>(runtime: Runtime.Runtime<R2>): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, R2>, E, A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, layer: Layer.Layer<R2, E2, A2>): Effect<R2 | Exclude<R, A2>, E | E2, A>
  <R, E, A, R2>(self: Effect<R, E, A>, context: Context.Context<R2>): Effect<Exclude<R, R2>, E, A>
  <R, E, A, R2>(self: Effect<R, E, A>, runtime: Runtime.Runtime<R2>): Effect<Exclude<R, R2>, E, A>
}
```

Added in v2.0.0

## provideService

Provides the effect with the single service it requires. If the effect
requires more than one service use `provideContext` instead.

**Signature**

```ts
export declare const provideService: {
  <T extends Context.Tag<any, any>>(tag: T, service: Context.Tag.Service<T>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<Exclude<R, Context.Tag.Identifier<T>>, E, A>
  <R, E, A, T extends Context.Tag<any, any>>(self: Effect<R, E, A>, tag: T, service: Context.Tag.Service<T>): Effect<
    Exclude<R, Context.Tag.Identifier<T>>,
    E,
    A
  >
}
```

Added in v2.0.0

## provideServiceEffect

Provides the effect with the single service it requires. If the effect
requires more than one service use `provideContext` instead.

**Signature**

```ts
export declare const provideServiceEffect: {
  <T extends Context.Tag<any, any>, R1, E1>(tag: T, effect: Effect<R1, E1, Context.Tag.Service<T>>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R1 | Exclude<R, Context.Tag.Identifier<T>>, E1 | E, A>
  <R, E, A, T extends Context.Tag<any, any>, R1, E1>(
    self: Effect<R, E, A>,
    tag: T,
    effect: Effect<R1, E1, Context.Tag.Service<T>>
  ): Effect<R1 | Exclude<R, Context.Tag.Identifier<T>>, E | E1, A>
}
```

Added in v2.0.0

## serviceConstants

**Signature**

```ts
export declare const serviceConstants: <I, S>(
  tag: Context.Tag<I, S>
) => {
  [k in { [k in keyof S]: S[k] extends Effect<any, any, any> ? k : never }[keyof S]]: S[k] extends Effect<
    infer R,
    infer E,
    infer A
  >
    ? Effect<I | R, E, A>
    : never
}
```

Added in v2.0.0

## serviceFunction

**Signature**

```ts
export declare const serviceFunction: <T extends Context.Tag<any, any>, Args extends any[], A>(
  service: T,
  f: (_: Context.Tag.Service<T>) => (...args: Args) => A
) => (...args: Args) => Effect<Context.Tag.Identifier<T>, never, A>
```

Added in v2.0.0

## serviceFunctionEffect

**Signature**

```ts
export declare const serviceFunctionEffect: <T extends Context.Tag<any, any>, Args extends any[], R, E, A>(
  service: T,
  f: (_: Context.Tag.Service<T>) => (...args: Args) => Effect<R, E, A>
) => (...args: Args) => Effect<R | Context.Tag.Identifier<T>, E, A>
```

Added in v2.0.0

## serviceFunctions

**Signature**

```ts
export declare const serviceFunctions: <I, S>(
  tag: Context.Tag<I, S>
) => {
  [k in {
    [k in keyof S]: S[k] extends (...args: Array<any>) => Effect<any, any, any> ? k : never
  }[keyof S]]: S[k] extends (...args: infer Args) => Effect<infer R, infer E, infer A>
    ? (...args: Args) => Effect<I | R, E, A>
    : never
}
```

Added in v2.0.0

## serviceMembers

**Signature**

```ts
export declare const serviceMembers: <I, S>(
  tag: Context.Tag<I, S>
) => {
  functions: {
    [k in {
      [k in keyof S]: S[k] extends (...args: Array<any>) => Effect<any, any, any> ? k : never
    }[keyof S]]: S[k] extends (...args: infer Args) => Effect<infer R, infer E, infer A>
      ? (...args: Args) => Effect<I | R, E, A>
      : never
  }
  constants: {
    [k in { [k in keyof S]: S[k] extends Effect<any, any, any> ? k : never }[keyof S]]: S[k] extends Effect<
      infer R,
      infer E,
      infer A
    >
      ? Effect<I | R, E, A>
      : never
  }
}
```

Added in v2.0.0

## serviceOption

**Signature**

```ts
export declare const serviceOption: <I, A>(tag: Context.Tag<I, A>) => Effect<never, never, Option.Option<A>>
```

Added in v2.0.0

## updateService

Updates the service with the required service entry.

**Signature**

```ts
export declare const updateService: {
  <T extends Context.Tag<any, any>>(tag: T, f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R | Context.Tag.Identifier<T>, E, A>
  <R, E, A, T extends Context.Tag<any, any>>(
    self: Effect<R, E, A>,
    tag: T,
    f: (service: Context.Tag.Service<T>) => Context.Tag.Service<T>
  ): Effect<R | Context.Tag.Identifier<T>, E, A>
}
```

Added in v2.0.0

# conversions

## either

Returns an effect whose failure and success have been lifted into an
`Either`. The resulting effect cannot fail, because the failure case has
been exposed as part of the `Either` success case.

This method is useful for recovering from effects that may fail.

The error parameter of the returned `Effect` is `never`, since it is
guaranteed the effect does not model failure.

**Signature**

```ts
export declare const either: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Either.Either<E, A>>
```

Added in v2.0.0

## exit

**Signature**

```ts
export declare const exit: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Exit.Exit<E, A>>
```

Added in v2.0.0

## intoDeferred

**Signature**

```ts
export declare const intoDeferred: {
  <E, A>(deferred: Deferred.Deferred<E, A>): <R>(self: Effect<R, E, A>) => Effect<R, never, boolean>
  <R, E, A>(self: Effect<R, E, A>, deferred: Deferred.Deferred<E, A>): Effect<R, never, boolean>
}
```

Added in v2.0.0

## option

Executes this effect, skipping the error but returning optionally the
success.

**Signature**

```ts
export declare const option: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Option.Option<A>>
```

Added in v2.0.0

# delays & timeouts

## delay

Returns an effect that is delayed from this effect by the specified
`Duration`.

**Signature**

```ts
export declare const delay: {
  (duration: Duration.DurationInput): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, duration: Duration.DurationInput): Effect<R, E, A>
}
```

Added in v2.0.0

## sleep

Returns an effect that suspends for the specified duration. This method is
asynchronous, and does not actually block the fiber executing the effect.

**Signature**

```ts
export declare const sleep: (duration: Duration.DurationInput) => Effect<never, never, void>
```

Added in v2.0.0

## timed

Returns a new effect that executes this one and times the execution.

**Signature**

```ts
export declare const timed: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, readonly [Duration.Duration, A]>
```

Added in v2.0.0

## timedWith

A more powerful variation of `timed` that allows specifying the clock.

**Signature**

```ts
export declare const timedWith: {
  <R1, E1>(nanoseconds: Effect<R1, E1, bigint>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R1 | R, E1 | E, readonly [Duration.Duration, A]>
  <R, E, A, R1, E1>(self: Effect<R, E, A>, nanoseconds: Effect<R1, E1, bigint>): Effect<
    R | R1,
    E | E1,
    readonly [Duration.Duration, A]
  >
}
```

Added in v2.0.0

## timeout

Returns an effect that will timeout this effect, returning `None` if the
timeout elapses before the effect has produced a value; and returning
`Some` of the produced value otherwise.

If the timeout elapses without producing a value, the running effect will
be safely interrupted.

WARNING: The effect returned by this method will not itself return until
the underlying effect is actually interrupted. This leads to more
predictable resource utilization. If early return is desired, then instead
of using `effect.timeout(d)`, use `effect.disconnect.timeout(d)`, which
first disconnects the effect's interruption signal before performing the
timeout, resulting in earliest possible return, before an underlying effect
has been successfully interrupted.

**Signature**

```ts
export declare const timeout: {
  (duration: Duration.DurationInput): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>>
  <R, E, A>(self: Effect<R, E, A>, duration: Duration.DurationInput): Effect<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## timeoutFail

The same as `timeout`, but instead of producing a `None` in the event of
timeout, it will produce the specified error.

**Signature**

```ts
export declare const timeoutFail: {
  <E1>(options: { readonly onTimeout: LazyArg<E1>; readonly duration: Duration.DurationInput }): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R, E1 | E, A>
  <R, E, A, E1>(
    self: Effect<R, E, A>,
    options: { readonly onTimeout: LazyArg<E1>; readonly duration: Duration.DurationInput }
  ): Effect<R, E | E1, A>
}
```

Added in v2.0.0

## timeoutFailCause

The same as `timeout`, but instead of producing a `None` in the event of
timeout, it will produce the specified failure.

**Signature**

```ts
export declare const timeoutFailCause: {
  <E1>(options: { readonly onTimeout: LazyArg<Cause.Cause<E1>>; readonly duration: Duration.DurationInput }): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R, E1 | E, A>
  <R, E, A, E1>(
    self: Effect<R, E, A>,
    options: { readonly onTimeout: LazyArg<Cause.Cause<E1>>; readonly duration: Duration.DurationInput }
  ): Effect<R, E | E1, A>
}
```

Added in v2.0.0

## timeoutTo

Returns an effect that will timeout this effect, returning either the
default value if the timeout elapses before the effect has produced a
value or returning the result of applying the function `onSuccess` to the
success value of the effect.

If the timeout elapses without producing a value, the running effect will
be safely interrupted.

**Signature**

```ts
export declare const timeoutTo: {
  <A, B, B1>(options: {
    readonly onTimeout: LazyArg<B1>
    readonly onSuccess: (a: A) => B
    readonly duration: Duration.DurationInput
  }): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B | B1>
  <R, E, A, B, B1>(
    self: Effect<R, E, A>,
    options: {
      readonly onTimeout: LazyArg<B1>
      readonly onSuccess: (a: A) => B
      readonly duration: Duration.DurationInput
    }
  ): Effect<R, E, B | B1>
}
```

Added in v2.0.0

# do notation

## Do

**Signature**

```ts
export declare const Do: Effect<never, never, {}>
```

Added in v2.0.0

## bind

Binds an effectful value in a `do` scope

**Signature**

```ts
export declare const bind: {
  <N extends string, K, R2, E2, A>(tag: Exclude<N, keyof K>, f: (_: K) => Effect<R2, E2, A>): <R, E>(
    self: Effect<R, E, K>
  ) => Effect<R2 | R, E2 | E, MergeRecord<K, { [k in N]: A }>>
  <R, E, N extends string, K, R2, E2, A>(
    self: Effect<R, E, K>,
    tag: Exclude<N, keyof K>,
    f: (_: K) => Effect<R2, E2, A>
  ): Effect<R | R2, E | E2, MergeRecord<K, { [k in N]: A }>>
}
```

Added in v2.0.0

## bindTo

**Signature**

```ts
export declare const bindTo: {
  <N extends string>(tag: N): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Record<N, A>>
  <R, E, A, N extends string>(self: Effect<R, E, A>, tag: N): Effect<R, E, Record<N, A>>
}
```

Added in v2.0.0

## let

Like bind for values

**Signature**

```ts
export declare const let: {
  <N extends string, K, A>(tag: Exclude<N, keyof K>, f: (_: K) => A): <R, E>(
    self: Effect<R, E, K>
  ) => Effect<R, E, MergeRecord<K, { [k in N]: A }>>
  <R, E, K, N extends string, A>(self: Effect<R, E, K>, tag: Exclude<N, keyof K>, f: (_: K) => A): Effect<
    R,
    E,
    MergeRecord<K, { [k in N]: A }>
  >
}
```

Added in v2.0.0

# error handling

## catch

Recovers from specified error.

**Signature**

```ts
export declare const catch: { <N extends keyof E, K extends E[N] & string, E, R1, E1, A1>(discriminator: N, options: { readonly failure: K; readonly onFailure: (error: Extract<E, { [n in N]: K; }>) => Effect<R1, E1, A1>; }): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | Exclude<E, { [n in N]: K; }>, A1 | A>; <R, E, A, N extends keyof E, K extends E[N] & string, R1, E1, A1>(self: Effect<R, E, A>, discriminator: N, options: { readonly failure: K; readonly onFailure: (error: Extract<E, { [n in N]: K; }>) => Effect<R1, E1, A1>; }): Effect<R | R1, E1 | Exclude<E, { [n in N]: K; }>, A | A1>; }
```

Added in v2.0.0

## catchAll

Recovers from all recoverable errors.

**Note**: that `Effect.catchAll` will not recover from unrecoverable defects. To
recover from both recoverable and unrecoverable errors use
`Effect.catchAllCause`.

**Signature**

```ts
export declare const catchAll: {
  <E, R2, E2, A2>(f: (e: E) => Effect<R2, E2, A2>): <R, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: Effect<R, E, A>, f: (e: E) => Effect<R2, E2, A2>): Effect<R | R2, E2, A | A2>
}
```

Added in v2.0.0

## catchAllCause

Recovers from both recoverable and unrecoverable errors.

See `absorb`, `sandbox`, `mapErrorCause` for other functions that can
recover from defects.

**Signature**

```ts
export declare const catchAllCause: {
  <E, R2, E2, A2>(f: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: Effect<R, E, A>, f: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>): Effect<
    R | R2,
    E2,
    A | A2
  >
}
```

Added in v2.0.0

## catchAllDefect

Recovers from all defects with provided function.

**WARNING**: There is no sensible way to recover from defects. This
method should be used only at the boundary between Effect and an external
system, to transmit information on a defect for diagnostic or explanatory
purposes.

**Signature**

```ts
export declare const catchAllDefect: {
  <R2, E2, A2>(f: (defect: unknown) => Effect<R2, E2, A2>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, f: (defect: unknown) => Effect<R2, E2, A2>): Effect<
    R | R2,
    E | E2,
    A | A2
  >
}
```

Added in v2.0.0

## catchIf

Recovers from errors that match the given predicate.

**Signature**

```ts
export declare const catchIf: {
  <E, EA extends E, EB extends EA, R2, E2, A2>(refinement: Refinement<EA, EB>, f: (e: EB) => Effect<R2, E2, A2>): <
    R,
    A
  >(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | Exclude<E, EB>, A2 | A>
  <E, EX extends E, R2, E2, A2>(predicate: Predicate<EX>, f: (e: EX) => Effect<R2, E2, A2>): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E | E2, A2 | A>
  <R, E, A, EA extends E, EB extends EA, R2, E2, A2>(
    self: Effect<R, E, A>,
    refinement: Refinement<EA, EB>,
    f: (e: EB) => Effect<R2, E2, A2>
  ): Effect<R | R2, E2 | Exclude<E, EB>, A | A2>
  <R, E, A, EX extends E, R2, E2, A2>(
    self: Effect<R, E, A>,
    predicate: Predicate<EX>,
    f: (e: EX) => Effect<R2, E2, A2>
  ): Effect<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## catchSome

Recovers from some or all of the error cases.

**Signature**

```ts
export declare const catchSome: {
  <E, R2, E2, A2>(pf: (e: E) => Option.Option<Effect<R2, E2, A2>>): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E | E2, A2 | A>
  <R, A, E, R2, E2, A2>(self: Effect<R, E, A>, pf: (e: E) => Option.Option<Effect<R2, E2, A2>>): Effect<
    R | R2,
    E | E2,
    A | A2
  >
}
```

Added in v2.0.0

## catchSomeCause

Recovers from some or all of the error cases with provided cause.

**Signature**

```ts
export declare const catchSomeCause: {
  <E, R2, E2, A2>(f: (cause: Cause.Cause<E>) => Option.Option<Effect<R2, E2, A2>>): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E | E2, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, f: (cause: Cause.Cause<E>) => Option.Option<Effect<R2, E2, A2>>): Effect<
    R | R2,
    E | E2,
    A | A2
  >
}
```

Added in v2.0.0

## catchSomeDefect

Recovers from some or all of the defects with provided partial function.

**WARNING**: There is no sensible way to recover from defects. This
method should be used only at the boundary between Effect and an external
system, to transmit information on a defect for diagnostic or explanatory
purposes.

**Signature**

```ts
export declare const catchSomeDefect: {
  <R2, E2, A2>(pf: (defect: unknown) => Option.Option<Effect<R2, E2, A2>>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, pf: (defect: unknown) => Option.Option<Effect<R2, E2, A2>>): Effect<
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
  <K extends E extends { _tag: string } ? E['_tag'] : never, E, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | Exclude<E, { _tag: K }>, A1 | A>
  <R, E, A, K extends E extends { _tag: string } ? E['_tag'] : never, R1, E1, A1>(
    self: Effect<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
  ): Effect<R | R1, E1 | Exclude<E, { _tag: K }>, A | A1>
}
```

Added in v2.0.0

## catchTags

Recovers from the specified tagged errors.

**Signature**

```ts
export declare const catchTags: {
  <
    E,
    Cases extends E extends { _tag: string }
      ? { [K in E['_tag']]+?: ((error: Extract<E, { _tag: K }>) => Effect<any, any, any>) | undefined }
      : {}
  >(
    cases: Cases
  ): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<
    | R
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<infer R, any, any> ? R : never
      }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, infer E, any> ? E : never
      }[keyof Cases],
    | A
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, any, infer A> ? A : never
      }[keyof Cases]
  >
  <
    R,
    E,
    A,
    Cases extends E extends { _tag: string }
      ? { [K in E['_tag']]+?: ((error: Extract<E, { _tag: K }>) => Effect<any, any, any>) | undefined }
      : {}
  >(
    self: Effect<R, E, A>,
    cases: Cases
  ): Effect<
    | R
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<infer R, any, any> ? R : never
      }[keyof Cases],
    | Exclude<E, { _tag: keyof Cases }>
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, infer E, any> ? E : never
      }[keyof Cases],
    | A
    | {
        [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect<any, any, infer A> ? A : never
      }[keyof Cases]
  >
}
```

Added in v2.0.0

## cause

Returns an effect that succeeds with the cause of failure of this effect,
or `Cause.empty` if the effect did succeed.

**Signature**

```ts
export declare const cause: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Cause.Cause<E>>
```

Added in v2.0.0

## eventually

Returns an effect that ignores errors and runs repeatedly until it
eventually succeeds.

**Signature**

```ts
export declare const eventually: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, A>
```

Added in v2.0.0

## ignore

Returns a new effect that ignores the success or failure of this effect.

**Signature**

```ts
export declare const ignore: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, void>
```

Added in v2.0.0

## ignoreLogged

Returns a new effect that ignores the success or failure of this effect,
but which also logs failures at the Debug level, just in case the failure
turns out to be important.

**Signature**

```ts
export declare const ignoreLogged: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, void>
```

Added in v2.0.0

## parallelErrors

Exposes all parallel errors in a single call.

**Signature**

```ts
export declare const parallelErrors: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E[], A>
```

Added in v2.0.0

## retry

Retries with the specified retry policy. Retries are done following the
failure of the original `io` (up to a fixed maximum with `once` or `recurs`
for example), so that that `io.retry(Schedule.once)` means "execute `io`
and in case of failure, try again once".

**Signature**

```ts
export declare const retry: {
  <R1, E extends E0, E0, B>(policy: Schedule.Schedule<R1, E0, B>): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>
  <R, E extends E0, E0, A, R1, B>(self: Effect<R, E, A>, policy: Schedule.Schedule<R1, E0, B>): Effect<R | R1, E, A>
}
```

Added in v2.0.0

## retryN

Retries this effect the specified number of times.

**Signature**

```ts
export declare const retryN: {
  (n: number): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, n: number): Effect<R, E, A>
}
```

Added in v2.0.0

## retryOrElse

Retries with the specified schedule, until it fails, and then both the
value produced by the schedule together with the last error are passed to
the recovery function.

**Signature**

```ts
export declare const retryOrElse: {
  <R1, E extends E3, A1, R2, E2, A2, E3>(
    policy: Schedule.Schedule<R1, E3, A1>,
    orElse: (e: E, out: A1) => Effect<R2, E2, A2>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R2 | R, E | E2, A2 | A>
  <R, E extends E3, A, R1, A1, R2, E2, A2, E3>(
    self: Effect<R, E, A>,
    policy: Schedule.Schedule<R1, E3, A1>,
    orElse: (e: E, out: A1) => Effect<R2, E2, A2>
  ): Effect<R | R1 | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## retryUntil

Retries this effect until its error satisfies the specified predicate.

**Signature**

```ts
export declare const retryUntil: {
  <E, E2 extends E>(f: Refinement<E, E2>): <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A>
  <E>(f: Predicate<E>): <R, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, E2 extends E>(self: Effect<R, E, A>, f: Refinement<E, E2>): Effect<R, E2, A>
  <R, E, A>(self: Effect<R, E, A>, f: Predicate<E>): Effect<R, E, A>
}
```

Added in v2.0.0

## retryUntilEffect

Retries this effect until its error satisfies the specified effectful
predicate.

**Signature**

```ts
export declare const retryUntilEffect: {
  <R1, E, E2>(f: (e: E) => Effect<R1, E2, boolean>): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E | E2, A>
  <R, E, A, R1, E2>(self: Effect<R, E, A>, f: (e: E) => Effect<R1, E2, boolean>): Effect<R | R1, E | E2, A>
}
```

Added in v2.0.0

## retryWhile

Retries this effect while its error satisfies the specified predicate.

**Signature**

```ts
export declare const retryWhile: {
  <E>(f: Predicate<E>): <R, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, f: Predicate<E>): Effect<R, E, A>
}
```

Added in v2.0.0

## retryWhileEffect

Retries this effect while its error satisfies the specified effectful
predicate.

**Signature**

```ts
export declare const retryWhileEffect: {
  <R1, E, E2>(f: (e: E) => Effect<R1, E2, boolean>): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E | E2, A>
  <R, E, A, R1, E2>(self: Effect<R, E, A>, f: (e: E) => Effect<R1, E2, boolean>): Effect<R | R1, E | E2, A>
}
```

Added in v2.0.0

## sandbox

Exposes the full `Cause` of failure for the specified effect.

**Signature**

```ts
export declare const sandbox: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Cause.Cause<E>, A>
```

Added in v2.0.0

## try

Imports a synchronous side-effect into a pure `Effect` value, translating any
thrown exceptions into typed failed effects creating with `Effect.fail`.

**Signature**

```ts
export declare const try: { <A, E>(options: { readonly try: LazyArg<A>; readonly catch: (error: unknown) => E; }): Effect<never, E, A>; <A>(evaluate: LazyArg<A>): Effect<never, unknown, A>; }
```

Added in v2.0.0

## tryMap

Returns an effect whose success is mapped by the specified side effecting
`try` function, translating any promise rejections into typed failed effects
via the `catch` function.

**Signature**

```ts
export declare const tryMap: {
  <A, B, E1>(options: { readonly try: (a: A) => B; readonly catch: (error: unknown) => E1 }): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R, E1 | E, B>
  <R, E, A, B, E1>(
    self: Effect<R, E, A>,
    options: { readonly try: (a: A) => B; readonly catch: (error: unknown) => E1 }
  ): Effect<R, E | E1, B>
}
```

Added in v2.0.0

## tryMapPromise

Returns an effect whose success is mapped by the specified side effecting
`try` function, translating any promise rejections into typed failed effects
via the `catch` function.

An optional `AbortSignal` can be provided to allow for interruption of the
wrapped Promise api.

**Signature**

```ts
export declare const tryMapPromise: {
  <A, B, E1>(options: {
    readonly try: (a: A, signal: AbortSignal) => Promise<B>
    readonly catch: (error: unknown) => E1
  }): <R, E>(self: Effect<R, E, A>) => Effect<R, E1 | E, B>
  <R, E, A, B, E1>(
    self: Effect<R, E, A>,
    options: { readonly try: (a: A, signal: AbortSignal) => Promise<B>; readonly catch: (error: unknown) => E1 }
  ): Effect<R, E | E1, B>
}
```

Added in v2.0.0

## tryPromise

Create an `Effect` that when executed will construct `promise` and wait for
its result, errors will produce failure as `unknown`.

An optional `AbortSignal` can be provided to allow for interruption of the
wrapped Promise api.

**Signature**

```ts
export declare const tryPromise: {
  <A, E>(options: { readonly try: (signal: AbortSignal) => Promise<A>; readonly catch: (error: unknown) => E }): Effect<
    never,
    E,
    A
  >
  <A>(try_: (signal: AbortSignal) => Promise<A>): Effect<never, unknown, A>
}
```

Added in v2.0.0

## unsandbox

The inverse operation `sandbox(effect)`

Terminates with exceptions on the `Left` side of the `Either` error, if it
exists. Otherwise extracts the contained `Effect<R, E, A>`

**Signature**

```ts
export declare const unsandbox: <R, E, A>(self: Effect<R, Cause.Cause<E>, A>) => Effect<R, E, A>
```

Added in v2.0.0

# execution

## runCallback

**Signature**

```ts
export declare const runCallback: <E, A>(
  effect: Effect<never, E, A>,
  onExit?: ((exit: Exit.Exit<E, A>) => void) | undefined
) => Runtime.Cancel<E, A>
```

Added in v2.0.0

## runFork

**Signature**

```ts
export declare const runFork: <E, A>(effect: Effect<never, E, A>) => Fiber.RuntimeFiber<E, A>
```

Added in v2.0.0

## runPromise

Runs an `Effect` workflow, returning a `Promise` which resolves with the
result of the workflow or rejects with an error.

**Signature**

```ts
export declare const runPromise: <E, A>(effect: Effect<never, E, A>) => Promise<A>
```

Added in v2.0.0

## runPromiseExit

Runs an `Effect` workflow, returning a `Promise` which resolves with the
`Exit` value of the workflow.

**Signature**

```ts
export declare const runPromiseExit: <E, A>(effect: Effect<never, E, A>) => Promise<Exit.Exit<E, A>>
```

Added in v2.0.0

## runSync

**Signature**

```ts
export declare const runSync: <E, A>(effect: Effect<never, E, A>) => A
```

Added in v2.0.0

## runSyncExit

**Signature**

```ts
export declare const runSyncExit: <E, A>(effect: Effect<never, E, A>) => Exit.Exit<E, A>
```

Added in v2.0.0

# fiber refs

## getFiberRefs

Returns a collection of all `FiberRef` values for the fiber running this
effect.

**Signature**

```ts
export declare const getFiberRefs: Effect<never, never, FiberRefs.FiberRefs>
```

Added in v2.0.0

## inheritFiberRefs

Inherits values from all `FiberRef` instances into current fiber.

**Signature**

```ts
export declare const inheritFiberRefs: (childFiberRefs: FiberRefs.FiberRefs) => Effect<never, never, void>
```

Added in v2.0.0

## locally

**Signature**

```ts
export declare const locally: {
  <A>(self: FiberRef.FiberRef<A>, value: A): <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B, A>(use: Effect<R, E, B>, self: FiberRef.FiberRef<A>, value: A): Effect<R, E, B>
}
```

Added in v2.0.0

## locallyScoped

**Signature**

```ts
export declare const locallyScoped: {
  <A>(value: A): (self: FiberRef.FiberRef<A>) => Effect<Scope.Scope, never, void>
  <A>(self: FiberRef.FiberRef<A>, value: A): Effect<Scope.Scope, never, void>
}
```

Added in v2.0.0

## locallyScopedWith

**Signature**

```ts
export declare const locallyScopedWith: {
  <A>(f: (a: A) => A): (self: FiberRef.FiberRef<A>) => Effect<Scope.Scope, never, void>
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A): Effect<Scope.Scope, never, void>
}
```

Added in v2.0.0

## locallyWith

**Signature**

```ts
export declare const locallyWith: {
  <A>(self: FiberRef.FiberRef<A>, f: (a: A) => A): <R, E, B>(use: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B, A>(use: Effect<R, E, B>, self: FiberRef.FiberRef<A>, f: (a: A) => A): Effect<R, E, B>
}
```

Added in v2.0.0

## patchFiberRefs

Applies the specified changes to the `FiberRef` values for the fiber
running this workflow.

**Signature**

```ts
export declare const patchFiberRefs: (patch: FiberRefsPatch.FiberRefsPatch) => Effect<never, never, void>
```

Added in v2.0.0

## setFiberRefs

Sets the `FiberRef` values for the fiber running this effect to the values
in the specified collection of `FiberRef` values.

**Signature**

```ts
export declare const setFiberRefs: (fiberRefs: FiberRefs.FiberRefs) => Effect<never, never, void>
```

Added in v2.0.0

## updateFiberRefs

Updates the `FiberRef` values for the fiber running this effect using the
specified function.

**Signature**

```ts
export declare const updateFiberRefs: (
  f: (fiberId: FiberId.Runtime, fiberRefs: FiberRefs.FiberRefs) => FiberRefs.FiberRefs
) => Effect<never, never, void>
```

Added in v2.0.0

# filtering & conditionals

## filterOrDie

Filter the specified effect with the provided function, dying with specified
defect if the predicate fails.

**Signature**

```ts
export declare const filterOrDie: {
  <A, B extends A, X extends A>(filter: Refinement<A, B>, orDieWith: (a: X) => unknown): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R, E, B>
  <A, X extends A, Y extends A>(filter: Predicate<X>, orDieWith: (a: Y) => unknown): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R, E, A>
  <R, E, A, B extends A, X extends A>(
    self: Effect<R, E, A>,
    filter: Refinement<A, B>,
    orDieWith: (a: X) => unknown
  ): Effect<R, E, B>
  <R, E, A, X extends A, Y extends A>(
    self: Effect<R, E, A>,
    filter: Predicate<X>,
    orDieWith: (a: Y) => unknown
  ): Effect<R, E, A>
}
```

Added in v2.0.0

## filterOrDieMessage

Filter the specified effect with the provided function, dying with specified
message if the predicate fails.

**Signature**

```ts
export declare const filterOrDieMessage: {
  <A, B extends A>(filter: Refinement<A, B>, message: string): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <A, X extends A>(filter: Predicate<X>, message: string): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, B extends A>(self: Effect<R, E, A>, filter: Refinement<A, B>, message: string): Effect<R, E, B>
  <R, E, A, X extends A>(self: Effect<R, E, A>, filter: Predicate<X>, message: string): Effect<R, E, A>
}
```

Added in v2.0.0

## filterOrElse

Filters the specified effect with the provided function returning the value
of the effect if it is successful, otherwise returns the value of `orElse`.

**Signature**

```ts
export declare const filterOrElse: {
  <A, B extends A, X extends A, R2, E2, C>(filter: Refinement<A, B>, orElse: (a: X) => Effect<R2, E2, C>): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, B | C>
  <A, X extends A, Y extends A, R2, E2, B>(filter: Predicate<X>, orElse: (a: Y) => Effect<R2, E2, B>): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, A | B>
  <R, E, A, B extends A, X extends A, R2, E2, C>(
    self: Effect<R, E, A>,
    filter: Refinement<A, B>,
    orElse: (a: X) => Effect<R2, E2, C>
  ): Effect<R | R2, E | E2, B | C>
  <R, E, A, X extends A, Y extends A, R2, E2, B>(
    self: Effect<R, E, A>,
    filter: Predicate<X>,
    orElse: (a: Y) => Effect<R2, E2, B>
  ): Effect<R | R2, E | E2, A | B>
}
```

Added in v2.0.0

## filterOrFail

Filter the specified effect with the provided function, failing with specified
error if the predicate fails.

**Signature**

```ts
export declare const filterOrFail: {
  <A, B extends A, X extends A, E2>(filter: Refinement<A, B>, orFailWith: (a: X) => E2): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R, E2 | E, B>
  <A, X extends A, Y extends A, E2>(filter: Predicate<X>, orFailWith: (a: Y) => E2): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R, E2 | E, A>
  <R, E, A, B extends A, X extends A, E2>(
    self: Effect<R, E, A>,
    filter: Refinement<A, B>,
    orFailWith: (a: X) => E2
  ): Effect<R, E | E2, B>
  <R, E, A, X extends A, Y extends A, E2>(
    self: Effect<R, E, A>,
    filter: Predicate<X>,
    orFailWith: (a: Y) => E2
  ): Effect<R, E | E2, A>
}
```

Added in v2.0.0

## if

Runs `onTrue` if the result of `self` is `true` and `onFalse` otherwise.

**Signature**

```ts
export declare const if: { <R1, R2, E1, E2, A, A1>(options: { readonly onTrue: Effect<R1, E1, A>; readonly onFalse: Effect<R2, E2, A1>; }): <R = never, E = never>(self: boolean | Effect<R, E, boolean>) => Effect<R1 | R2 | R, E1 | E2 | E, A | A1>; <R1, R2, E1, E2, A, A1>(self: boolean, options: { readonly onTrue: Effect<R1, E1, A>; readonly onFalse: Effect<R2, E2, A1>; }): Effect<R1 | R2, E1 | E2, A | A1>; <R, E, R1, R2, E1, E2, A, A1>(self: Effect<R, E, boolean>, options: { readonly onTrue: Effect<R1, E1, A>; readonly onFalse: Effect<R2, E2, A1>; }): Effect<R | R1 | R2, E | E1 | E2, A | A1>; }
```

Added in v2.0.0

## unless

The moral equivalent of `if (!p) exp`.

**Signature**

```ts
export declare const unless: {
  (predicate: LazyArg<boolean>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>>
  <R, E, A>(self: Effect<R, E, A>, predicate: LazyArg<boolean>): Effect<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## unlessEffect

The moral equivalent of `if (!p) exp` when `p` has side-effects.

**Signature**

```ts
export declare const unlessEffect: {
  <R2, E2>(predicate: Effect<R2, E2, boolean>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, Option.Option<A>>
  <R, E, A, R2, E2>(self: Effect<R, E, A>, predicate: Effect<R2, E2, boolean>): Effect<R | R2, E | E2, Option.Option<A>>
}
```

Added in v2.0.0

## when

The moral equivalent of `if (p) exp`.

**Signature**

```ts
export declare const when: {
  (predicate: LazyArg<boolean>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>>
  <R, E, A>(self: Effect<R, E, A>, predicate: LazyArg<boolean>): Effect<R, E, Option.Option<A>>
}
```

Added in v2.0.0

## whenEffect

**Signature**

```ts
export declare const whenEffect: {
  <R, E>(predicate: Effect<R, E, boolean>): <R2, E2, A>(
    effect: Effect<R2, E2, A>
  ) => Effect<R | R2, E | E2, Option.Option<A>>
  <R, E, A, R2, E2>(self: Effect<R2, E2, A>, predicate: Effect<R, E, boolean>): Effect<R | R2, E | E2, Option.Option<A>>
}
```

Added in v2.0.0

## whenFiberRef

Executes this workflow when value of the specified `FiberRef` satisfies the
predicate.

**Signature**

```ts
export declare const whenFiberRef: {
  <S>(fiberRef: FiberRef.FiberRef<S>, predicate: Predicate<S>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R, E, readonly [S, Option.Option<A>]>
  <R, E, A, S>(self: Effect<R, E, A>, fiberRef: FiberRef.FiberRef<S>, predicate: Predicate<S>): Effect<
    R,
    E,
    readonly [S, Option.Option<A>]
  >
}
```

Added in v2.0.0

## whenRef

Executes this workflow when the value of the `Ref` satisfies the predicate.

**Signature**

```ts
export declare const whenRef: {
  <S>(ref: Ref.Ref<S>, predicate: Predicate<S>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R, E, readonly [S, Option.Option<A>]>
  <R, E, A, S>(self: Effect<R, E, A>, ref: Ref.Ref<S>, predicate: Predicate<S>): Effect<
    R,
    E,
    readonly [S, Option.Option<A>]
  >
}
```

Added in v2.0.0

# getters & folding

## isFailure

Returns `true` if this effect is a failure, `false` otherwise.

**Signature**

```ts
export declare const isFailure: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, boolean>
```

Added in v2.0.0

## isSuccess

Returns `true` if this effect is a success, `false` otherwise.

**Signature**

```ts
export declare const isSuccess: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, boolean>
```

Added in v2.0.0

## match

Folds over the failure value or the success value to yield an effect that
does not fail, but succeeds with the value returned by the left or right
function passed to `match`.

**Signature**

```ts
export declare const match: {
  <E, A, A2, A3>(options: { readonly onFailure: (error: E) => A2; readonly onSuccess: (value: A) => A3 }): <R>(
    self: Effect<R, E, A>
  ) => Effect<R, never, A2 | A3>
  <R, E, A, A2, A3>(
    self: Effect<R, E, A>,
    options: { readonly onFailure: (error: E) => A2; readonly onSuccess: (value: A) => A3 }
  ): Effect<R, never, A2 | A3>
}
```

Added in v2.0.0

## matchCause

**Signature**

```ts
export declare const matchCause: {
  <E, A2, A, A3>(options: { readonly onFailure: (cause: Cause.Cause<E>) => A2; readonly onSuccess: (a: A) => A3 }): <R>(
    self: Effect<R, E, A>
  ) => Effect<R, never, A2 | A3>
  <R, E, A2, A, A3>(
    self: Effect<R, E, A>,
    options: { readonly onFailure: (cause: Cause.Cause<E>) => A2; readonly onSuccess: (a: A) => A3 }
  ): Effect<R, never, A2 | A3>
}
```

Added in v2.0.0

## matchCauseEffect

**Signature**

```ts
export declare const matchCauseEffect: {
  <E, A, R2, E2, A2, R3, E3, A3>(options: {
    readonly onFailure: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>
    readonly onSuccess: (a: A) => Effect<R3, E3, A3>
  }): <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Effect<R2, E2, A2>
      readonly onSuccess: (a: A) => Effect<R3, E3, A3>
    }
  ): Effect<R | R2 | R3, E2 | E3, A2 | A3>
}
```

Added in v2.0.0

## matchEffect

**Signature**

```ts
export declare const matchEffect: {
  <E, A, R2, E2, A2, R3, E3, A3>(options: {
    readonly onFailure: (e: E) => Effect<R2, E2, A2>
    readonly onSuccess: (a: A) => Effect<R3, E3, A3>
  }): <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Effect<R, E, A>,
    options: { readonly onFailure: (e: E) => Effect<R2, E2, A2>; readonly onSuccess: (a: A) => Effect<R3, E3, A3> }
  ): Effect<R | R2 | R3, E2 | E3, A2 | A3>
}
```

Added in v2.0.0

# interruption

## allowInterrupt

This function checks if any fibers are attempting to interrupt the current
fiber, and if so, performs self-interruption.

Note that this allows for interruption to occur in uninterruptible regions.

**Signature**

```ts
export declare const allowInterrupt: Effect<never, never, void>
```

Added in v2.0.0

## checkInterruptible

Checks the interrupt status, and produces the effect returned by the
specified callback.

**Signature**

```ts
export declare const checkInterruptible: <R, E, A>(f: (isInterruptible: boolean) => Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## disconnect

Returns an effect whose interruption will be disconnected from the
fiber's own interruption, being performed in the background without
slowing down the fiber's interruption.

This method is useful to create "fast interrupting" effects. For
example, if you call this on a bracketed effect, then even if the
effect is "stuck" in acquire or release, its interruption will return
immediately, while the acquire / release are performed in the
background.

See timeout and race for other applications.

**Signature**

```ts
export declare const disconnect: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## interrupt

**Signature**

```ts
export declare const interrupt: Effect<never, never, never>
```

Added in v2.0.0

## interruptWith

**Signature**

```ts
export declare const interruptWith: (fiberId: FiberId.FiberId) => Effect<never, never, never>
```

Added in v2.0.0

## interruptible

**Signature**

```ts
export declare const interruptible: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## interruptibleMask

**Signature**

```ts
export declare const interruptibleMask: <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect<RX, EX, AX>) => Effect<RX, EX, AX>) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

## onInterrupt

**Signature**

```ts
export declare const onInterrupt: {
  <R2, X>(cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, never, X>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E, A>
  <R, E, A, R2, X>(
    self: Effect<R, E, A>,
    cleanup: (interruptors: HashSet.HashSet<FiberId.FiberId>) => Effect<R2, never, X>
  ): Effect<R | R2, E, A>
}
```

Added in v2.0.0

## uninterruptible

**Signature**

```ts
export declare const uninterruptible: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## uninterruptibleMask

**Signature**

```ts
export declare const uninterruptibleMask: <R, E, A>(
  f: (restore: <RX, EX, AX>(effect: Effect<RX, EX, AX>) => Effect<RX, EX, AX>) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

# logging

## annotateLogs

Annotates each log in this effect with the specified log annotation.

**Signature**

```ts
export declare const annotateLogs: {
  (key: string, value: unknown): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  (values: Record<string, unknown>): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, key: string, value: unknown): Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, values: Record<string, unknown>): Effect<R, E, A>
}
```

Added in v2.0.0

## log

Logs the specified message or cause at the current log level.

You can set the current log level using `FiberRef.currentLogLevel`.

**Signature**

```ts
export declare const log: <A>(
  messageOrCause: A,
  supplementary?: (A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>) | undefined
) => Effect<never, never, void>
```

Added in v2.0.0

## logAnnotations

Retrieves the log annotations associated with the current scope.

**Signature**

```ts
export declare const logAnnotations: Effect<never, never, HashMap.HashMap<string, unknown>>
```

Added in v2.0.0

## logDebug

Logs the specified message or cause at the Debug log level.

**Signature**

```ts
export declare const logDebug: <A>(
  messageOrCause: A,
  supplementary?: (A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>) | undefined
) => Effect<never, never, void>
```

Added in v2.0.0

## logError

Logs the specified message or cause at the Error log level.

**Signature**

```ts
export declare const logError: <A>(
  messageOrCause: A,
  supplementary?: (A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>) | undefined
) => Effect<never, never, void>
```

Added in v2.0.0

## logFatal

Logs the specified message or cause at the Fatal log level.

**Signature**

```ts
export declare const logFatal: <A>(
  messageOrCause: A,
  supplementary?: (A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>) | undefined
) => Effect<never, never, void>
```

Added in v2.0.0

## logInfo

Logs the specified message or cause at the Info log level.

**Signature**

```ts
export declare const logInfo: <A>(
  messageOrCause: A,
  supplementary?: (A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>) | undefined
) => Effect<never, never, void>
```

Added in v2.0.0

## logTrace

Logs the specified message or cause at the Trace log level.

**Signature**

```ts
export declare const logTrace: <A>(
  messageOrCause: A,
  supplementary?: (A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>) | undefined
) => Effect<never, never, void>
```

Added in v2.0.0

## logWarning

Logs the specified message or cause at the Warning log level.

**Signature**

```ts
export declare const logWarning: <A>(
  messageOrCause: A,
  supplementary?: (A extends Cause.Cause<any> ? unknown : Cause.Cause<unknown>) | undefined
) => Effect<never, never, void>
```

Added in v2.0.0

## withLogSpan

Adjusts the label for the current logging span.

**Signature**

```ts
export declare const withLogSpan: {
  (label: string): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, label: string): Effect<R, E, A>
}
```

Added in v2.0.0

## withUnhandledErrorLogLevel

Decides wether child fibers will report or not unhandled errors via the logger

**Signature**

```ts
export declare const withUnhandledErrorLogLevel: {
  (level: Option.Option<LogLevel>): <R, E, B>(self: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(self: Effect<R, E, B>, level: Option.Option<LogLevel>): Effect<R, E, B>
}
```

Added in v2.0.0

# mapping

## as

This function maps the success value of an `Effect` value to a specified
constant value.

**Signature**

```ts
export declare const as: {
  <B>(value: B): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, B>
  <R, E, A, B>(self: Effect<R, E, A>, value: B): Effect<R, E, B>
}
```

Added in v2.0.0

## asSome

This function maps the success value of an `Effect` value to a `Some` value
in an `Option` value. If the original `Effect` value fails, the returned
`Effect` value will also fail.

**Signature**

```ts
export declare const asSome: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Option.Option<A>>
```

Added in v2.0.0

## asSomeError

This function maps the error value of an `Effect` value to a `Some` value
in an `Option` value. If the original `Effect` value succeeds, the returned
`Effect` value will also succeed.

**Signature**

```ts
export declare const asSomeError: <R, E, A>(self: Effect<R, E, A>) => Effect<R, Option.Option<E>, A>
```

Added in v2.0.0

## asUnit

This function maps the success value of an `Effect` value to `void`. If the
original `Effect` value succeeds, the returned `Effect` value will also
succeed. If the original `Effect` value fails, the returned `Effect` value
will fail with the same error.

**Signature**

```ts
export declare const asUnit: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, void>
```

Added in v2.0.0

## flip

Returns an effect that swaps the error/success cases. This allows you to
use all methods on the error channel, possibly before flipping back.

**Signature**

```ts
export declare const flip: <R, E, A>(self: Effect<R, E, A>) => Effect<R, A, E>
```

Added in v2.0.0

## flipWith

Swaps the error/value parameters, applies the function `f` and flips the
parameters back

**Signature**

```ts
export declare const flipWith: {
  <R, A, E, R2, A2, E2>(f: (effect: Effect<R, A, E>) => Effect<R2, A2, E2>): (
    self: Effect<R, E, A>
  ) => Effect<R2, E2, A2>
  <R, A, E, R2, A2, E2>(self: Effect<R, E, A>, f: (effect: Effect<R, A, E>) => Effect<R2, A2, E2>): Effect<R2, E2, A2>
}
```

Added in v2.0.0

## map

**Signature**

```ts
export declare const map: {
  <A, B>(f: (a: A) => B): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <R, E, A, B>(self: Effect<R, E, A>, f: (a: A) => B): Effect<R, E, B>
}
```

Added in v2.0.0

## mapAccum

Statefully and effectfully maps over the elements of this chunk to produce
new elements.

**Signature**

```ts
export declare const mapAccum: {
  <A, B, R, E, Z>(zero: Z, f: (z: Z, a: A, i: number) => Effect<R, E, readonly [Z, B]>): (
    elements: Iterable<A>
  ) => Effect<R, E, readonly [Z, B[]]>
  <A, B, R, E, Z>(elements: Iterable<A>, zero: Z, f: (z: Z, a: A, i: number) => Effect<R, E, readonly [Z, B]>): Effect<
    R,
    E,
    readonly [Z, B[]]
  >
}
```

Added in v2.0.0

## mapBoth

Returns an effect whose failure and success channels have been mapped by
the specified `onFailure` and `onSuccess` functions.

**Signature**

```ts
export declare const mapBoth: {
  <E, A, E2, A2>(options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }): <R>(
    self: Effect<R, E, A>
  ) => Effect<R, E2, A2>
  <R, E, A, E2, A2>(
    self: Effect<R, E, A>,
    options: { readonly onFailure: (e: E) => E2; readonly onSuccess: (a: A) => A2 }
  ): Effect<R, E2, A2>
}
```

Added in v2.0.0

## mapError

Returns an effect with its error channel mapped using the specified function.

**Signature**

```ts
export declare const mapError: {
  <E, E2>(f: (e: E) => E2): <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A>
  <R, A, E, E2>(self: Effect<R, E, A>, f: (e: E) => E2): Effect<R, E2, A>
}
```

Added in v2.0.0

## mapErrorCause

Returns an effect with its full cause of failure mapped using the specified
function. This can be used to transform errors while preserving the
original structure of `Cause`.

See `absorb`, `sandbox`, `catchAllCause` for other functions for dealing
with defects.

**Signature**

```ts
export declare const mapErrorCause: {
  <E, E2>(f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): <R, A>(self: Effect<R, E, A>) => Effect<R, E2, A>
  <R, E, A, E2>(self: Effect<R, E, A>, f: (cause: Cause.Cause<E>) => Cause.Cause<E2>): Effect<R, E2, A>
}
```

Added in v2.0.0

## merge

Returns a new effect where the error channel has been merged into the
success channel to their common combined type.

**Signature**

```ts
export declare const merge: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, E | A>
```

Added in v2.0.0

## negate

Returns a new effect where boolean value of this effect is negated.

**Signature**

```ts
export declare const negate: <R, E>(self: Effect<R, E, boolean>) => Effect<R, E, boolean>
```

Added in v2.0.0

# metrics

## labelMetrics

Tags each metric in this effect with the specific tag.

**Signature**

```ts
export declare const labelMetrics: {
  (labels: Iterable<MetricLabel.MetricLabel>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, labels: Iterable<MetricLabel.MetricLabel>): Effect<R, E, A>
}
```

Added in v2.0.0

## labelMetricsScoped

Tags each metric in a scope with a the specific tag.

**Signature**

```ts
export declare const labelMetricsScoped: (
  labels: ReadonlyArray<MetricLabel.MetricLabel>
) => Effect<Scope.Scope, never, void>
```

Added in v2.0.0

## labelMetricsScopedSet

Tags each metric in a scope with a the specific tag.

**Signature**

```ts
export declare const labelMetricsScopedSet: (
  labels: HashSet.HashSet<MetricLabel.MetricLabel>
) => Effect<Scope.Scope, never, void>
```

Added in v2.0.0

## labelMetricsSet

Tags each metric in this effect with the specific tag.

**Signature**

```ts
export declare const labelMetricsSet: {
  (labels: HashSet.HashSet<MetricLabel.MetricLabel>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, labels: HashSet.HashSet<MetricLabel.MetricLabel>): Effect<R, E, A>
}
```

Added in v2.0.0

## metricLabels

Retrieves the metric labels associated with the current scope.

**Signature**

```ts
export declare const metricLabels: Effect<never, never, HashSet.HashSet<MetricLabel.MetricLabel>>
```

Added in v2.0.0

## tagMetrics

Tags each metric in this effect with the specific tag.

**Signature**

```ts
export declare const tagMetrics: {
  (key: string, value: string): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  (values: Record<string, string>): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, key: string, value: string): Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, values: Record<string, string>): Effect<R, E, A>
}
```

Added in v2.0.0

## tagMetricsScoped

Tags each metric in a scope with a the specific tag.

**Signature**

```ts
export declare const tagMetricsScoped: (key: string, value: string) => Effect<Scope.Scope, never, void>
```

Added in v2.0.0

## withMetric

**Signature**

```ts
export declare const withMetric: {
  <Type, In, Out>(metric: Metric.Metric<Type, In, Out>): <R, E, A extends In>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A extends In, Type, In, Out>(self: Effect<R, E, A>, metric: Metric.Metric<Type, In, Out>): Effect<R, E, A>
}
```

Added in v2.0.0

# models

## Adapter (interface)

**Signature**

```ts
export interface Adapter {
  <R, E, A>(self: Effect<R, E, A>): EffectGen<R, E, A>
  <A, _R, _E, _A>(a: A, ab: (a: A) => Effect<_R, _E, _A>): EffectGen<_R, _E, _A>
  <A, B, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => Effect<_R, _E, _A>): EffectGen<_R, _E, _A>
  <A, B, C, _R, _E, _A>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => Effect<_R, _E, _A>): EffectGen<_R, _E, _A>
  <A, B, C, D, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
  <A, B, C, D, E, F, G, H, _R, _E, _A>(
    a: A,
    ab: (a: A) => B,
    bc: (b: B) => C,
    cd: (c: C) => D,
    de: (d: D) => E,
    ef: (e: E) => F,
    fg: (f: F) => G,
    gh: (g: G) => H,
    hi: (g: H) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    ij: (i: I) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    jk: (j: J) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    kl: (k: K) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    lm: (l: L) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    mn: (m: M) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    no: (n: N) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    op: (o: O) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    pq: (p: P) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    qr: (q: Q) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    rs: (r: R) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    st: (s: S) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
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
    tu: (s: T) => Effect<_R, _E, _A>
  ): EffectGen<_R, _E, _A>
}
```

Added in v2.0.0

## Blocked (interface)

**Signature**

```ts
export interface Blocked<R, E, A> extends Effect<R, E, A> {
  readonly _op: 'Blocked'
  readonly i0: RequestBlock<R>
  readonly i1: Effect<R, E, A>
}
```

Added in v2.0.0

## Effect (interface)

The `Effect` interface defines a value that lazily describes a workflow or job.
The workflow requires some context `R`, and may fail with an error of type `E`,
or succeed with a value of type `A`.

`Effect` values model resourceful interaction with the outside world, including
synchronous, asynchronous, concurrent, and parallel interaction. They use a
fiber-based concurrency model, with built-in support for scheduling, fine-grained
interruption, structured concurrency, and high scalability.

To run an `Effect` value, you need a `Runtime`, which is a type that is capable
of executing `Effect` values.

**Signature**

```ts
export interface Effect<R, E, A> extends Effect.Variance<R, E, A>, Equal.Equal, Pipeable {
  readonly [Unify.typeSymbol]?: unknown
  readonly [Unify.unifySymbol]?: EffectUnify<this>
  readonly [Unify.blacklistSymbol]?: EffectUnifyBlacklist
}
```

Added in v2.0.0

## EffectGen (interface)

**Signature**

```ts
export interface EffectGen<R, E, A> {
  readonly _R: () => R
  readonly _E: () => E
  readonly _A: () => A
  readonly value: Effect<R, E, A>

  [Symbol.iterator](): Generator<EffectGen<R, E, A>, A>
}
```

Added in v2.0.0

## EffectUnify (interface)

**Signature**

```ts
export interface EffectUnify<A extends { [Unify.typeSymbol]?: any }>
  extends Either.EitherUnify<A>,
    Option.OptionUnify<A>,
    Context.TagUnify<A> {
  Effect?: () => A[Unify.typeSymbol] extends Effect<infer R0, infer E0, infer A0> | infer _ ? Effect<R0, E0, A0> : never
}
```

Added in v2.0.0

## EffectUnifyBlacklist (interface)

**Signature**

```ts
export interface EffectUnifyBlacklist {
  Tag?: true
  Option?: true
  Either?: true
}
```

Added in v2.0.0

# optionality

## fromNullable

Returns an effect that errors with `NoSuchElementException` if the value is
null or undefined, otherwise succeeds with the value.

**Signature**

```ts
export declare const fromNullable: <A>(value: A) => Effect<never, Cause.NoSuchElementException, NonNullable<A>>
```

Added in v2.0.0

## optionFromOptional

Wraps the success value of this effect with `Option.some`, and maps
`Cause.NoSuchElementException` to `Option.none`.

**Signature**

```ts
export declare const optionFromOptional: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<R, Exclude<E, Cause.NoSuchElementException>, Option.Option<A>>
```

Added in v2.0.0

# random

## random

Retreives the `Random` service from the context.

**Signature**

```ts
export declare const random: Effect<never, never, Random.Random>
```

Added in v2.0.0

## randomWith

Retreives the `Random` service from the context and uses it to run the
specified workflow.

**Signature**

```ts
export declare const randomWith: <R, E, A>(f: (random: Random.Random) => Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

# refinements

## isEffect

This function returns `true` if the specified value is an `Effect` value,
`false` otherwise.

This function can be useful for checking the type of a value before
attempting to operate on it as an `Effect` value. For example, you could
use `isEffect` to check the type of a value before using it as an
argument to a function that expects an `Effect` value.

**Signature**

```ts
export declare const isEffect: (u: unknown) => u is Effect<unknown, unknown, unknown>
```

Added in v2.0.0

# repetition / recursion

## forever

Repeats this effect forever (until the first error).

**Signature**

```ts
export declare const forever: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, never>
```

Added in v2.0.0

## iterate

The `Effect.iterate` function allows you to iterate with an effectful operation. It uses an effectful `body` operation to change the state during each iteration and continues the iteration as long as the `while` function evaluates to `true`:

```ts
Effect.iterate(initial, options: { while, body })
```

We can think of `Effect.iterate` as equivalent to a `while` loop in JavaScript:

```ts
let result = initial

while (options.while(result)) {
  result = options.body(result)
}

return result
```

**Signature**

```ts
export declare const iterate: {
  <A, B extends A, R, E>(
    initial: A,
    options: { readonly while: Refinement<A, B>; readonly body: (b: B) => Effect<R, E, A> }
  ): Effect<R, E, A>
  <A, R, E>(
    initial: A,
    options: { readonly while: (a: A) => boolean; readonly body: (a: A) => Effect<R, E, A> }
  ): Effect<R, E, A>
}
```

Added in v2.0.0

## loop

The `Effect.loop` function allows you to repeatedly change the state based on an `step` function until a condition given by the `while` function is evaluated to `true`:

```ts
Effect.loop(initial, options: { while, step, body })
```

It collects all intermediate states in an array and returns it as the final result.

We can think of Effect.loop as equivalent to a while loop in JavaScript:

```ts
let state = initial
const result = []

while (options.while(state)) {
  result.push(options.body(state))
  state = options.step(state)
}

return result
```

**Signature**

```ts
export declare const loop: {
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: (z: Z) => boolean
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => Effect<R, E, A>
      readonly discard?: false | undefined
    }
  ): Effect<R, E, A[]>
  <Z, R, E, A>(
    initial: Z,
    options: {
      readonly while: (z: Z) => boolean
      readonly step: (z: Z) => Z
      readonly body: (z: Z) => Effect<R, E, A>
      readonly discard: true
    }
  ): Effect<R, E, void>
}
```

Added in v2.0.0

## repeat

Returns a new effect that repeats this effect according to the specified
schedule or until the first failure. Scheduled recurrences are in addition
to the first execution, so that `io.repeat(Schedule.once)` yields an effect
that executes `io`, and then if that succeeds, executes `io` an additional
time.

**Signature**

```ts
export declare const repeat: {
  <R1, A extends A0, A0, B>(schedule: Schedule.Schedule<R1, A, B>): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R1 | R, E, B>
  <R, E, A extends A0, A0, R1, B>(self: Effect<R, E, A>, schedule: Schedule.Schedule<R1, A0, B>): Effect<R | R1, E, B>
}
```

Added in v2.0.0

## repeatN

Returns a new effect that repeats this effect the specified number of times
or until the first failure. Repeats are in addition to the first execution,
so that `io.repeatN(1)` yields an effect that executes `io`, and then if
that succeeds, executes `io` an additional time.

**Signature**

```ts
export declare const repeatN: {
  (n: number): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, n: number): Effect<R, E, A>
}
```

Added in v2.0.0

## repeatOrElse

Returns a new effect that repeats this effect according to the specified
schedule or until the first failure, at which point, the failure value and
schedule output are passed to the specified handler.

Scheduled recurrences are in addition to the first execution, so that
`pipe(effect, Effect.repeat(Schedule.once()))` yields an effect that executes
`effect`, and then if that succeeds, executes `effect` an additional time.

**Signature**

```ts
export declare const repeatOrElse: {
  <R2, A extends A0, A0, B, E, R3, E2>(
    schedule: Schedule.Schedule<R2, A, B>,
    orElse: (error: E, option: Option.Option<B>) => Effect<R3, E2, B>
  ): <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E2, B>
  <R, E, A extends A0, A0, R2, B, R3, E2>(
    self: Effect<R, E, A>,
    schedule: Schedule.Schedule<R2, A0, B>,
    orElse: (error: E, option: Option.Option<B>) => Effect<R3, E2, B>
  ): Effect<R | R2 | R3, E2, B>
}
```

Added in v2.0.0

## repeatUntil

Repeats this effect until its value satisfies the specified predicate or
until the first failure.

**Signature**

```ts
export declare const repeatUntil: {
  <A, B extends A>(f: Refinement<A, B>): <R, E>(self: Effect<R, E, A>) => Effect<R, E, B>
  <A>(f: Predicate<A>): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, B extends A>(self: Effect<R, E, A>, f: Predicate<A>): Effect<R, E, B>
  <R, E, A>(self: Effect<R, E, A>, f: Predicate<A>): Effect<R, E, A>
}
```

Added in v2.0.0

## repeatUntilEffect

Repeats this effect until its value satisfies the specified effectful
predicate or until the first failure.

**Signature**

```ts
export declare const repeatUntilEffect: {
  <A, R2, E2>(f: (a: A) => Effect<R2, E2, boolean>): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>
  <R, E, A, R2, E2>(self: Effect<R, E, A>, f: (a: A) => Effect<R2, E2, boolean>): Effect<R | R2, E | E2, A>
}
```

Added in v2.0.0

## repeatWhile

Repeats this effect while its value satisfies the specified effectful
predicate or until the first failure.

**Signature**

```ts
export declare const repeatWhile: {
  <A>(f: Predicate<A>): <R, E>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, f: Predicate<A>): Effect<R, E, A>
}
```

Added in v2.0.0

## repeatWhileEffect

Repeats this effect while its value satisfies the specified effectful
predicate or until the first failure.

**Signature**

```ts
export declare const repeatWhileEffect: {
  <R1, A, E2>(f: (a: A) => Effect<R1, E2, boolean>): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E2 | E, A>
  <R, E, R1, A, E2>(self: Effect<R, E, A>, f: (a: A) => Effect<R1, E2, boolean>): Effect<R | R1, E | E2, A>
}
```

Added in v2.0.0

## schedule

Runs this effect according to the specified schedule.

See `scheduleFrom` for a variant that allows the schedule's decision to
depend on the result of this effect.

**Signature**

```ts
export declare const schedule: {
  <R2, Out>(schedule: Schedule.Schedule<R2, unknown, Out>): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E, Out>
  <R, E, A, R2, Out>(self: Effect<R, E, A>, schedule: Schedule.Schedule<R2, unknown, Out>): Effect<R | R2, E, Out>
}
```

Added in v2.0.0

## scheduleForked

Runs this effect according to the specified schedule in a new fiber
attached to the current scope.

**Signature**

```ts
export declare const scheduleForked: {
  <R2, Out>(schedule: Schedule.Schedule<R2, unknown, Out>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<Scope.Scope | R2 | R, never, Fiber.RuntimeFiber<E, Out>>
  <R, E, A, R2, Out>(self: Effect<R, E, A>, schedule: Schedule.Schedule<R2, unknown, Out>): Effect<
    Scope.Scope | R | R2,
    never,
    Fiber.RuntimeFiber<E, Out>
  >
}
```

Added in v2.0.0

## scheduleFrom

Runs this effect according to the specified schedule starting from the
specified input value.

**Signature**

```ts
export declare const scheduleFrom: {
  <R2, In, Out>(initial: In, schedule: Schedule.Schedule<R2, In, Out>): <R, E>(
    self: Effect<R, E, In>
  ) => Effect<R2 | R, E, Out>
  <R, E, In, R2, Out>(self: Effect<R, E, In>, initial: In, schedule: Schedule.Schedule<R2, In, Out>): Effect<
    R | R2,
    E,
    Out
  >
}
```

Added in v2.0.0

## whileLoop

**Signature**

```ts
export declare const whileLoop: <R, E, A>(options: {
  readonly while: LazyArg<boolean>
  readonly body: LazyArg<Effect<R, E, A>>
  readonly step: (a: A) => void
}) => Effect<R, E, void>
```

Added in v2.0.0

# requests & batching

## blocked

**Signature**

```ts
export declare const blocked: <R, E, A>(
  blockedRequests: RequestBlock<R>,
  _continue: Effect<R, E, A>
) => Blocked<R, E, A>
```

Added in v2.0.0

## cacheRequestResult

**Signature**

```ts
export declare const cacheRequestResult: <A extends Request.Request<any, any>>(
  request: A,
  result: Request.Request.Result<A>
) => Effect<never, never, void>
```

Added in v2.0.0

## flatMapStep

**Signature**

```ts
export declare const flatMapStep: <R, E, A, R1, E1, B>(
  self: Effect<R, E, A>,
  f: (step: Exit.Exit<E, A> | Blocked<R, E, A>) => Effect<R1, E1, B>
) => Effect<R | R1, E1, B>
```

Added in v2.0.0

## request

**Signature**

```ts
export declare const request: <
  A extends Request.Request<any, any>,
  Ds extends RequestResolver<A, never> | Effect<any, any, RequestResolver<A, never>>
>(
  request: A,
  dataSource: Ds
) => Effect<
  [Ds] extends [Effect<any, any, any>] ? Effect.Context<Ds> : never,
  Request.Request.Error<A>,
  Request.Request.Success<A>
>
```

Added in v2.0.0

## runRequestBlock

**Signature**

```ts
export declare const runRequestBlock: <R>(blockedRequests: RequestBlock<R>) => Blocked<R, never, void>
```

Added in v2.0.0

## step

**Signature**

```ts
export declare const step: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, Exit.Exit<E, A> | Blocked<R, E, A>>
```

Added in v2.0.0

## withRequestBatching

**Signature**

```ts
export declare const withRequestBatching: {
  (requestBatching: boolean): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, requestBatching: boolean): Effect<R, E, A>
}
```

Added in v2.0.0

## withRequestCache

**Signature**

```ts
export declare const withRequestCache: {
  (cache: Request.Cache): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, cache: Request.Cache): Effect<R, E, A>
}
```

Added in v2.0.0

## withRequestCaching

**Signature**

```ts
export declare const withRequestCaching: {
  (strategy: boolean): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, strategy: boolean): Effect<R, E, A>
}
```

Added in v2.0.0

# runtime

## getRuntimeFlags

Retrieves an effect that succeeds with the current runtime flags, which
govern behavior and features of the runtime system.

**Signature**

```ts
export declare const getRuntimeFlags: Effect<never, never, RuntimeFlags.RuntimeFlags>
```

Added in v2.0.0

## patchRuntimeFlags

**Signature**

```ts
export declare const patchRuntimeFlags: (patch: RuntimeFlagsPatch.RuntimeFlagsPatch) => Effect<never, never, void>
```

Added in v2.0.0

## runtime

Returns an effect that accesses the runtime, which can be used to
(unsafely) execute tasks. This is useful for integration with legacy code
that must call back into Effect code.

**Signature**

```ts
export declare const runtime: <R>() => Effect<R, never, Runtime.Runtime<R>>
```

Added in v2.0.0

## withRuntimeFlagsPatch

**Signature**

```ts
export declare const withRuntimeFlagsPatch: {
  (update: RuntimeFlagsPatch.RuntimeFlagsPatch): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, update: RuntimeFlagsPatch.RuntimeFlagsPatch): Effect<R, E, A>
}
```

Added in v2.0.0

## withRuntimeFlagsPatchScoped

**Signature**

```ts
export declare const withRuntimeFlagsPatchScoped: (
  update: RuntimeFlagsPatch.RuntimeFlagsPatch
) => Effect<Scope.Scope, never, void>
```

Added in v2.0.0

# scheduler

## withScheduler

Sets the provided scheduler for usage in the wrapped effect

**Signature**

```ts
export declare const withScheduler: {
  (scheduler: Scheduler.Scheduler): <R, E, B>(self: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(self: Effect<R, E, B>, scheduler: Scheduler.Scheduler): Effect<R, E, B>
}
```

Added in v2.0.0

# scoping, resources & finalization

## acquireRelease

This function constructs a scoped resource from an `acquire` and `release`
`Effect` value.

If the `acquire` `Effect` value successfully completes execution, then the
`release` `Effect` value will be added to the finalizers associated with the
scope of this `Effect` value, and it is guaranteed to be run when the scope
is closed.

The `acquire` and `release` `Effect` values will be run uninterruptibly.
Additionally, the `release` `Effect` value may depend on the `Exit` value
specified when the scope is closed.

**Signature**

```ts
export declare const acquireRelease: {
  <A, R2, X>(release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>): <R, E>(
    acquire: Effect<R, E, A>
  ) => Effect<Scope.Scope | R2 | R, E, A>
  <R, E, A, R2, X>(
    acquire: Effect<R, E, A>,
    release: (a: A, exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>
  ): Effect<Scope.Scope | R | R2, E, A>
}
```

Added in v2.0.0

## acquireReleaseInterruptible

This function constructs a scoped resource from an `acquire` and `release`
`Effect` value.

If the `acquire` `Effect` value successfully completes execution, then the
`release` `Effect` value will be added to the finalizers associated with the
scope of this `Effect` value, and it is guaranteed to be run when the scope
is closed.

The `acquire` `Effect` values will be run interruptibly.
The `release` `Effect` values will be run uninterruptibly.

Additionally, the `release` `Effect` value may depend on the `Exit` value
specified when the scope is closed.

**Signature**

```ts
export declare const acquireReleaseInterruptible: {
  <A, R2, X>(release: (exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>): <R, E>(
    acquire: Effect<R, E, A>
  ) => Effect<Scope.Scope | R2 | R, E, A>
  <R, E, A, R2, X>(
    acquire: Effect<R, E, A>,
    release: (exit: Exit.Exit<unknown, unknown>) => Effect<R2, never, X>
  ): Effect<Scope.Scope | R | R2, E, A>
}
```

Added in v2.0.0

## acquireUseRelease

This function is used to ensure that an `Effect` value that represents the
acquisition of a resource (for example, opening a file, launching a thread,
etc.) will not be interrupted, and that the resource will always be released
when the `Effect` value completes execution.

`acquireUseRelease` does the following:

1. Ensures that the `Effect` value that acquires the resource will not be
   interrupted. Note that acquisition may still fail due to internal
   reasons (such as an uncaught exception).
2. Ensures that the `release` `Effect` value will not be interrupted,
   and will be executed as long as the acquisition `Effect` value
   successfully acquires the resource.

During the time period between the acquisition and release of the resource,
the `use` `Effect` value will be executed.

If the `release` `Effect` value fails, then the entire `Effect` value will
fail, even if the `use` `Effect` value succeeds. If this fail-fast behavior
is not desired, errors produced by the `release` `Effect` value can be caught
and ignored.

**Signature**

```ts
export declare const acquireUseRelease: {
  <A, R2, E2, A2, R3, X>(
    use: (a: A) => Effect<R2, E2, A2>,
    release: (a: A, exit: Exit.Exit<E2, A2>) => Effect<R3, never, X>
  ): <R, E>(acquire: Effect<R, E, A>) => Effect<R2 | R3 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2, R3, X>(
    acquire: Effect<R, E, A>,
    use: (a: A) => Effect<R2, E2, A2>,
    release: (a: A, exit: Exit.Exit<E2, A2>) => Effect<R3, never, X>
  ): Effect<R | R2 | R3, E | E2, A2>
}
```

Added in v2.0.0

## addFinalizer

This function adds a finalizer to the scope of the calling `Effect` value.
The finalizer is guaranteed to be run when the scope is closed, and it may
depend on the `Exit` value that the scope is closed with.

**Signature**

```ts
export declare const addFinalizer: <R, X>(
  finalizer: (exit: Exit.Exit<unknown, unknown>) => Effect<R, never, X>
) => Effect<Scope.Scope | R, never, void>
```

Added in v2.0.0

## ensuring

Returns an effect that, if this effect _starts_ execution, then the
specified `finalizer` is guaranteed to be executed, whether this effect
succeeds, fails, or is interrupted.

For use cases that need access to the effect's result, see `onExit`.

Finalizers offer very powerful guarantees, but they are low-level, and
should generally not be used for releasing resources. For higher-level
logic built on `ensuring`, see the `acquireRelease` family of methods.

**Signature**

```ts
export declare const ensuring: {
  <R1, X>(finalizer: Effect<R1, never, X>): <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E, A>
  <R, E, A, R1, X>(self: Effect<R, E, A>, finalizer: Effect<R1, never, X>): Effect<R | R1, E, A>
}
```

Added in v2.0.0

## finalizersMask

**Signature**

```ts
export declare const finalizersMask: (
  strategy: ExecutionStrategy
) => <R, E, A>(
  self: (restore: <R1, E1, A1>(self: Effect<R1, E1, A1>) => Effect<R1, E1, A1>) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

## onError

Runs the specified effect if this effect fails, providing the error to the
effect if it exists. The provided effect will not be interrupted.

**Signature**

```ts
export declare const onError: {
  <E, R2, X>(cleanup: (cause: Cause.Cause<E>) => Effect<R2, never, X>): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E, A>
  <R, A, E, R2, X>(self: Effect<R, E, A>, cleanup: (cause: Cause.Cause<E>) => Effect<R2, never, X>): Effect<
    R | R2,
    E,
    A
  >
}
```

Added in v2.0.0

## onExit

Ensures that a cleanup functions runs, whether this effect succeeds, fails,
or is interrupted.

**Signature**

```ts
export declare const onExit: {
  <E, A, R2, X>(cleanup: (exit: Exit.Exit<E, A>) => Effect<R2, never, X>): <R>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E, A>
  <R, E, A, R2, X>(self: Effect<R, E, A>, cleanup: (exit: Exit.Exit<E, A>) => Effect<R2, never, X>): Effect<
    R | R2,
    E,
    A
  >
}
```

Added in v2.0.0

## parallelFinalizers

**Signature**

```ts
export declare const parallelFinalizers: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## scope

**Signature**

```ts
export declare const scope: Effect<Scope.Scope, never, Scope.Scope>
```

Added in v2.0.0

## scopeWith

Accesses the current scope and uses it to perform the specified effect.

**Signature**

```ts
export declare const scopeWith: <R, E, A>(f: (scope: Scope.Scope) => Effect<R, E, A>) => Effect<Scope.Scope | R, E, A>
```

Added in v2.0.0

## scoped

Scopes all resources uses in this workflow to the lifetime of the workflow,
ensuring that their finalizers are run as soon as this workflow completes
execution, whether by success, failure, or interruption.

**Signature**

```ts
export declare const scoped: <R, E, A>(effect: Effect<R, E, A>) => Effect<Exclude<R, Scope.Scope>, E, A>
```

Added in v2.0.0

## sequentialFinalizers

Returns a new scoped workflow that runs finalizers added to the scope of
this workflow sequentially in the reverse of the order in which they were
added. Note that finalizers are run sequentially by default so this only
has meaning if used within a scope where finalizers are being run in
parallel.

**Signature**

```ts
export declare const sequentialFinalizers: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## using

Scopes all resources acquired by `resource` to the lifetime of `use`
without effecting the scope of any resources acquired by `use`.

**Signature**

```ts
export declare const using: {
  <A, R2, E2, A2>(use: (a: A) => Effect<R2, E2, A2>): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R2 | Exclude<R, Scope.Scope>, E2 | E, A2>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, use: (a: A) => Effect<R2, E2, A2>): Effect<
    R2 | Exclude<R, Scope.Scope>,
    E | E2,
    A2
  >
}
```

Added in v2.0.0

## withEarlyRelease

Returns a new scoped workflow that returns the result of this workflow as
well as a finalizer that can be run to close the scope of this workflow.

**Signature**

```ts
export declare const withEarlyRelease: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<Scope.Scope | R, E, readonly [Effect<never, never, void>, A]>
```

Added in v2.0.0

# semaphore

## Permit (interface)

**Signature**

```ts
export interface Permit {
  readonly index: number
}
```

Added in v2.0.0

## Semaphore (interface)

**Signature**

```ts
export interface Semaphore {
  readonly withPermits: (permits: number) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  readonly take: (permits: number) => Effect<never, never, number>
  readonly release: (permits: number) => Effect<never, never, void>
}
```

Added in v2.0.0

## makeSemaphore

Creates a new Semaphore

**Signature**

```ts
export declare const makeSemaphore: (permits: number) => Effect<never, never, Semaphore>
```

Added in v2.0.0

## unsafeMakeSemaphore

Unsafely creates a new Semaphore

**Signature**

```ts
export declare const unsafeMakeSemaphore: (permits: number) => Semaphore
```

Added in v2.0.0

# sequencing

## flatMap

This function is a pipeable operator that maps over an `Effect` value,
flattening the result of the mapping function into a new `Effect` value.

**Signature**

```ts
export declare const flatMap: {
  <A, R1, E1, B>(f: (a: A) => Effect<R1, E1, B>): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, B>
  <R, E, A, R1, E1, B>(self: Effect<R, E, A>, f: (a: A) => Effect<R1, E1, B>): Effect<R | R1, E | E1, B>
}
```

Added in v2.0.0

## flatten

**Signature**

```ts
export declare const flatten: <R, E, R1, E1, A>(self: Effect<R, E, Effect<R1, E1, A>>) => Effect<R | R1, E | E1, A>
```

Added in v2.0.0

## race

Returns an effect that races this effect with the specified effect,
returning the first successful `A` from the faster side. If one effect
succeeds, the other will be interrupted. If neither succeeds, then the
effect will fail with some error.

**Signature**

```ts
export declare const race: {
  <R2, E2, A2>(that: Effect<R2, E2, A2>): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, that: Effect<R2, E2, A2>): Effect<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## raceAll

Returns an effect that races this effect with all the specified effects,
yielding the value of the first effect to succeed with a value. Losers of
the race will be interrupted immediately

**Signature**

```ts
export declare const raceAll: <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, E, A>
```

Added in v2.0.0

## raceFirst

Returns an effect that races this effect with the specified effect,
yielding the first result to complete, whether by success or failure. If
neither effect completes, then the composed effect will not complete.

WARNING: The raced effect will safely interrupt the "loser", but will not
resume until the loser has been cleanly terminated. If early return is
desired, then instead of performing `l raceFirst r`, perform
`l.disconnect raceFirst r.disconnect`, which disconnects left and right
interrupt signal, allowing a fast return, with interruption performed
in the background.

**Signature**

```ts
export declare const raceFirst: {
  <R2, E2, A2>(that: Effect<R2, E2, A2>): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2 | A>
  <R, E, A, R2, E2, A2>(self: Effect<R, E, A>, that: Effect<R2, E2, A2>): Effect<R | R2, E | E2, A | A2>
}
```

Added in v2.0.0

## raceWith

Returns an effect that races this effect with the specified effect, calling
the specified finisher as soon as one result or the other has been computed.

**Signature**

```ts
export declare const raceWith: {
  <E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    other: Effect<R1, E1, A1>,
    options: {
      readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>
      readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>
    }
  ): <R>(self: Effect<R, E, A>) => Effect<R1 | R2 | R3 | R, E2 | E3, A2 | A3>
  <R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
    self: Effect<R, E, A>,
    other: Effect<R1, E1, A1>,
    options: {
      readonly onSelfDone: (exit: Exit.Exit<E, A>, fiber: Fiber.Fiber<E1, A1>) => Effect<R2, E2, A2>
      readonly onOtherDone: (exit: Exit.Exit<E1, A1>, fiber: Fiber.Fiber<E, A>) => Effect<R3, E3, A3>
    }
  ): Effect<R | R1 | R2 | R3, E2 | E3, A2 | A3>
}
```

Added in v2.0.0

## summarized

Summarizes a effect by computing some value before and after execution, and
then combining the values to produce a summary, together with the result of
execution.

**Signature**

```ts
export declare const summarized: {
  <R2, E2, B, C>(summary: Effect<R2, E2, B>, f: (start: B, end: B) => C): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, readonly [C, A]>
  <R, E, A, R2, E2, B, C>(self: Effect<R, E, A>, summary: Effect<R2, E2, B>, f: (start: B, end: B) => C): Effect<
    R | R2,
    E | E2,
    readonly [C, A]
  >
}
```

Added in v2.0.0

## tap

**Signature**

```ts
export declare const tap: {
  <A, X extends A, R2, E2, _>(f: (a: X) => Effect<R2, E2, _>): <R, E>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, A>
  <R, E, A, X extends A, R2, E2, _>(self: Effect<R, E, A>, f: (a: X) => Effect<R2, E2, _>): Effect<R | R2, E | E2, A>
}
```

Added in v2.0.0

## tapBoth

Returns an effect that effectfully "peeks" at the failure or success of
this effect.

**Signature**

```ts
export declare const tapBoth: {
  <E, XE extends E, A, XA extends A, R2, E2, X, R3, E3, X1>(options: {
    readonly onFailure: (e: XE) => Effect<R2, E2, X>
    readonly onSuccess: (a: XA) => Effect<R3, E3, X1>
  }): <R>(self: Effect<R, E, A>) => Effect<R2 | R3 | R, E | E2 | E3, A>
  <R, E, A, XE extends E, XA extends A, R2, E2, X, R3, E3, X1>(
    self: Effect<R, E, A>,
    options: { readonly onFailure: (e: XE) => Effect<R2, E2, X>; readonly onSuccess: (a: XA) => Effect<R3, E3, X1> }
  ): Effect<R | R2 | R3, E | E2 | E3, A>
}
```

Added in v2.0.0

## tapDefect

Returns an effect that effectually "peeks" at the defect of this effect.

**Signature**

```ts
export declare const tapDefect: {
  <R2, E2, X>(f: (cause: Cause.Cause<never>) => Effect<R2, E2, X>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, X>(self: Effect<R, E, A>, f: (cause: Cause.Cause<never>) => Effect<R2, E2, X>): Effect<
    R | R2,
    E | E2,
    A
  >
}
```

Added in v2.0.0

## tapError

Returns an effect that effectfully "peeks" at the failure of this effect.

**Signature**

```ts
export declare const tapError: {
  <E, XE extends E, R2, E2, X>(f: (e: XE) => Effect<R2, E2, X>): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E | E2, A>
  <R, E, XE extends E, A, R2, E2, X>(self: Effect<R, E, A>, f: (e: XE) => Effect<R2, E2, X>): Effect<R | R2, E | E2, A>
}
```

Added in v2.0.0

## tapErrorCause

Returns an effect that effectually "peeks" at the cause of the failure of
this effect.

**Signature**

```ts
export declare const tapErrorCause: {
  <E, XE extends E, R2, E2, X>(f: (cause: Cause.Cause<XE>) => Effect<R2, E2, X>): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E | E2, A>
  <R, E, A, XE extends E, R2, E2, X>(self: Effect<R, E, A>, f: (cause: Cause.Cause<XE>) => Effect<R2, E2, X>): Effect<
    R | R2,
    E | E2,
    A
  >
}
```

Added in v2.0.0

## tapErrorTag

Returns an effect that effectfully "peeks" at the specific tagged failure of this effect.

**Signature**

```ts
export declare const tapErrorTag: {
  <K extends E extends { _tag: string } ? E['_tag'] : never, E, R1, E1, A1>(
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
  ): <R, A>(self: Effect<R, E, A>) => Effect<R1 | R, E | E1, A>
  <R, E, A, K extends E extends { _tag: string } ? E['_tag'] : never, R1, E1, A1>(
    self: Effect<R, E, A>,
    k: K,
    f: (e: Extract<E, { _tag: K }>) => Effect<R1, E1, A1>
  ): Effect<R | R1, E | E1, A>
}
```

Added in v2.0.0

# supervision & fibers

## awaitAllChildren

Returns a new effect that will not succeed with its value before first
waiting for the end of all child fibers forked by the effect.

**Signature**

```ts
export declare const awaitAllChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## daemonChildren

Returns a new workflow that will not supervise any fibers forked by this
workflow.

**Signature**

```ts
export declare const daemonChildren: <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## descriptor

Constructs an effect with information about the current `Fiber`.

**Signature**

```ts
export declare const descriptor: Effect<never, never, Fiber.Fiber.Descriptor>
```

Added in v2.0.0

## descriptorWith

Constructs an effect based on information about the current `Fiber`.

**Signature**

```ts
export declare const descriptorWith: <R, E, A>(
  f: (descriptor: Fiber.Fiber.Descriptor) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

## diffFiberRefs

Returns a new workflow that executes this one and captures the changes in
`FiberRef` values.

**Signature**

```ts
export declare const diffFiberRefs: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<R, E, readonly [FiberRefsPatch.FiberRefsPatch, A]>
```

Added in v2.0.0

## ensuringChild

Acts on the children of this fiber (collected into a single fiber),
guaranteeing the specified callback will be invoked, whether or not this
effect succeeds.

**Signature**

```ts
export declare const ensuringChild: {
  <R2, X>(f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect<R2, never, X>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R2 | R, E, A>
  <R, E, A, R2, X>(
    self: Effect<R, E, A>,
    f: (fiber: Fiber.Fiber<any, ReadonlyArray<unknown>>) => Effect<R2, never, X>
  ): Effect<R | R2, E, A>
}
```

Added in v2.0.0

## ensuringChildren

Acts on the children of this fiber, guaranteeing the specified callback
will be invoked, whether or not this effect succeeds.

**Signature**

```ts
export declare const ensuringChildren: {
  <R1, X>(children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect<R1, never, X>): <R, E, A>(
    self: Effect<R, E, A>
  ) => Effect<R1 | R, E, A>
  <R, E, A, R1, X>(
    self: Effect<R, E, A>,
    children: (fibers: ReadonlyArray<Fiber.RuntimeFiber<any, any>>) => Effect<R1, never, X>
  ): Effect<R | R1, E, A>
}
```

Added in v2.0.0

## fiberId

**Signature**

```ts
export declare const fiberId: Effect<never, never, FiberId.FiberId>
```

Added in v2.0.0

## fiberIdWith

**Signature**

```ts
export declare const fiberIdWith: <R, E, A>(f: (descriptor: FiberId.Runtime) => Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## fork

Returns an effect that forks this effect into its own separate fiber,
returning the fiber immediately, without waiting for it to begin executing
the effect.

You can use the `fork` method whenever you want to execute an effect in a
new fiber, concurrently and without "blocking" the fiber executing other
effects. Using fibers can be tricky, so instead of using this method
directly, consider other higher-level methods, such as `raceWith`,
`zipPar`, and so forth.

The fiber returned by this method has methods to interrupt the fiber and to
wait for it to finish executing the effect. See `Fiber` for more
information.

Whenever you use this method to launch a new fiber, the new fiber is
attached to the parent fiber's scope. This means when the parent fiber
terminates, the child fiber will be terminated as well, ensuring that no
fibers leak. This behavior is called "auto supervision", and if this
behavior is not desired, you may use the `forkDaemon` or `forkIn` methods.

**Signature**

```ts
export declare const fork: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>>
```

Added in v2.0.0

## forkAll

Returns an effect that forks all of the specified values, and returns a
composite fiber that produces a list of their results, in order.

**Signature**

```ts
export declare const forkAll: {
  (options?: { readonly discard?: false }): <R, E, A>(
    effects: Iterable<Effect<R, E, A>>
  ) => Effect<R, never, Fiber.Fiber<E, A[]>>
  (options: { readonly discard: true }): <R, E, A>(effects: Iterable<Effect<R, E, A>>) => Effect<R, never, void>
  <R, E, A>(effects: Iterable<Effect<R, E, A>>, options?: { readonly discard?: false }): Effect<
    R,
    never,
    Fiber.Fiber<E, A[]>
  >
  <R, E, A>(effects: Iterable<Effect<R, E, A>>, options: { readonly discard: true }): Effect<R, never, void>
}
```

Added in v2.0.0

## forkDaemon

Forks the effect into a new fiber attached to the global scope. Because the
new fiber is attached to the global scope, when the fiber executing the
returned effect terminates, the forked fiber will continue running.

**Signature**

```ts
export declare const forkDaemon: <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>>
```

Added in v2.0.0

## forkIn

Forks the effect in the specified scope. The fiber will be interrupted
when the scope is closed.

**Signature**

```ts
export declare const forkIn: {
  (scope: Scope.Scope): <R, E, A>(self: Effect<R, E, A>) => Effect<R, never, Fiber.RuntimeFiber<E, A>>
  <R, E, A>(self: Effect<R, E, A>, scope: Scope.Scope): Effect<R, never, Fiber.RuntimeFiber<E, A>>
}
```

Added in v2.0.0

## forkScoped

Forks the fiber in a `Scope`, interrupting it when the scope is closed.

**Signature**

```ts
export declare const forkScoped: <R, E, A>(
  self: Effect<R, E, A>
) => Effect<Scope.Scope | R, never, Fiber.RuntimeFiber<E, A>>
```

Added in v2.0.0

## forkWithErrorHandler

Like fork but handles an error with the provided handler.

**Signature**

```ts
export declare const forkWithErrorHandler: {
  <E, X>(handler: (e: E) => Effect<never, never, X>): <R, A>(
    self: Effect<R, E, A>
  ) => Effect<R, never, Fiber.RuntimeFiber<E, A>>
  <R, E, A, X>(self: Effect<R, E, A>, handler: (e: E) => Effect<never, never, X>): Effect<
    R,
    never,
    Fiber.RuntimeFiber<E, A>
  >
}
```

Added in v2.0.0

## fromFiber

Creates an `Effect` value that represents the exit value of the specified
fiber.

**Signature**

```ts
export declare const fromFiber: <E, A>(fiber: Fiber.Fiber<E, A>) => Effect<never, E, A>
```

Added in v2.0.0

## fromFiberEffect

Creates an `Effect` value that represents the exit value of the specified
fiber.

**Signature**

```ts
export declare const fromFiberEffect: <R, E, A>(fiber: Effect<R, E, Fiber.Fiber<E, A>>) => Effect<R, E, A>
```

Added in v2.0.0

## supervised

Returns an effect with the behavior of this one, but where all child fibers
forked in the effect are reported to the specified supervisor.

**Signature**

```ts
export declare const supervised: {
  <X>(supervisor: Supervisor.Supervisor<X>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A, X>(self: Effect<R, E, A>, supervisor: Supervisor.Supervisor<X>): Effect<R, E, A>
}
```

Added in v2.0.0

## transplant

Transplants specified effects so that when those effects fork other
effects, the forked effects will be governed by the scope of the fiber that
executes this effect.

This can be used to "graft" deep grandchildren onto a higher-level scope,
effectively extending their lifespans into the parent scope.

**Signature**

```ts
export declare const transplant: <R, E, A>(
  f: (grafter: <R2, E2, A2>(effect: Effect<R2, E2, A2>) => Effect<R2, E2, A2>) => Effect<R, E, A>
) => Effect<R, E, A>
```

Added in v2.0.0

## withConcurrency

**Signature**

```ts
export declare const withConcurrency: {
  (concurrency: number | 'unbounded'): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, concurrency: number | 'unbounded'): Effect<R, E, A>
}
```

Added in v2.0.0

# symbols

## EffectTypeId

**Signature**

```ts
export declare const EffectTypeId: typeof EffectTypeId
```

Added in v2.0.0

## EffectTypeId (type alias)

**Signature**

```ts
export type EffectTypeId = typeof EffectTypeId
```

Added in v2.0.0

# tracing

## annotateCurrentSpan

Adds an annotation to the current span if available

**Signature**

```ts
export declare const annotateCurrentSpan: {
  (key: string, value: unknown): Effect<never, never, void>
  (values: Record<string, unknown>): Effect<never, never, void>
}
```

Added in v2.0.0

## annotateSpans

Adds an annotation to each span in this effect.

**Signature**

```ts
export declare const annotateSpans: {
  (key: string, value: unknown): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  (values: Record<string, unknown>): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, key: string, value: unknown): Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, values: Record<string, unknown>): Effect<R, E, A>
}
```

Added in v2.0.0

## currentParentSpan

**Signature**

```ts
export declare const currentParentSpan: Effect<never, never, Option.Option<Tracer.ParentSpan>>
```

Added in v2.0.0

## currentSpan

**Signature**

```ts
export declare const currentSpan: Effect<never, never, Option.Option<Tracer.Span>>
```

Added in v2.0.0

## linkSpans

For all spans in this effect, add a link with the provided span.

**Signature**

```ts
export declare const linkSpans: {
  (span: Tracer.ParentSpan, attributes?: Record<string, unknown>): <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(self: Effect<R, E, A>, span: Tracer.ParentSpan, attributes?: Record<string, unknown>): Effect<R, E, A>
}
```

Added in v2.0.0

## makeSpan

Create a new span for tracing.

**Signature**

```ts
export declare const makeSpan: (
  name: string,
  options?: {
    readonly attributes?: Record<string, unknown>
    readonly links?: ReadonlyArray<Tracer.SpanLink>
    readonly parent?: Tracer.ParentSpan
    readonly root?: boolean
    readonly context?: Context.Context<never>
  }
) => Effect<never, never, Tracer.Span>
```

Added in v2.0.0

## makeSpanScoped

Create a new span for tracing, and automatically close it when the Scope
finalizes.

The span is not added to the current span stack, so no child spans will be
created for it.

**Signature**

```ts
export declare const makeSpanScoped: (
  name: string,
  options?: {
    readonly attributes?: Record<string, unknown>
    readonly links?: ReadonlyArray<Tracer.SpanLink>
    readonly parent?: Tracer.ParentSpan
    readonly root?: boolean
    readonly context?: Context.Context<never>
  }
) => Effect<Scope.Scope, never, Tracer.Span>
```

Added in v2.0.0

## spanAnnotations

**Signature**

```ts
export declare const spanAnnotations: Effect<never, never, HashMap.HashMap<string, unknown>>
```

Added in v2.0.0

## spanLinks

**Signature**

```ts
export declare const spanLinks: Effect<never, never, Chunk.Chunk<Tracer.SpanLink>>
```

Added in v2.0.0

## tracer

**Signature**

```ts
export declare const tracer: Effect<never, never, Tracer.Tracer>
```

Added in v2.0.0

## tracerWith

**Signature**

```ts
export declare const tracerWith: <R, E, A>(f: (tracer: Tracer.Tracer) => Effect<R, E, A>) => Effect<R, E, A>
```

Added in v2.0.0

## useSpan

Create a new span for tracing, and automatically close it when the effect
completes.

The span is not added to the current span stack, so no child spans will be
created for it.

**Signature**

```ts
export declare const useSpan: {
  <R, E, A>(name: string, evaluate: (span: Tracer.Span) => Effect<R, E, A>): Effect<R, E, A>
  <R, E, A>(
    name: string,
    options: {
      readonly attributes?: Record<string, unknown>
      readonly links?: ReadonlyArray<Tracer.SpanLink>
      readonly parent?: Tracer.ParentSpan
      readonly root?: boolean
      readonly context?: Context.Context<never>
    },
    evaluate: (span: Tracer.Span) => Effect<R, E, A>
  ): Effect<R, E, A>
}
```

Added in v2.0.0

## withParentSpan

Adds the provided span to the current span stack.

**Signature**

```ts
export declare const withParentSpan: {
  (span: Tracer.ParentSpan): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, Tracer.ParentSpan>, E, A>
  <R, E, A>(self: Effect<R, E, A>, span: Tracer.ParentSpan): Effect<Exclude<R, Tracer.ParentSpan>, E, A>
}
```

Added in v2.0.0

## withSpan

Wraps the effect with a new span for tracing.

**Signature**

```ts
export declare const withSpan: {
  (
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown>
      readonly links?: ReadonlyArray<Tracer.SpanLink>
      readonly parent?: Tracer.ParentSpan
      readonly root?: boolean
      readonly context?: Context.Context<never>
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<Exclude<R, Tracer.ParentSpan>, E, A>
  <R, E, A>(
    self: Effect<R, E, A>,
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown>
      readonly links?: ReadonlyArray<Tracer.SpanLink>
      readonly parent?: Tracer.ParentSpan
      readonly root?: boolean
      readonly context?: Context.Context<never>
    }
  ): Effect<Exclude<R, Tracer.ParentSpan>, E, A>
}
```

Added in v2.0.0

## withSpanScoped

Wraps the effect with a new span for tracing.

The span is ended when the Scope is finalized.

**Signature**

```ts
export declare const withSpanScoped: {
  (
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown>
      readonly links?: ReadonlyArray<Tracer.SpanLink>
      readonly parent?: Tracer.ParentSpan
      readonly root?: boolean
      readonly context?: Context.Context<never>
    }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<Scope.Scope | Exclude<R, Tracer.ParentSpan>, E, A>
  <R, E, A>(
    self: Effect<R, E, A>,
    name: string,
    options?: {
      readonly attributes?: Record<string, unknown>
      readonly links?: ReadonlyArray<Tracer.SpanLink>
      readonly parent?: Tracer.ParentSpan
      readonly root?: boolean
      readonly context?: Context.Context<never>
    }
  ): Effect<Scope.Scope | Exclude<R, Tracer.ParentSpan>, E, A>
}
```

Added in v2.0.0

## withTracer

**Signature**

```ts
export declare const withTracer: {
  (value: Tracer.Tracer): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, value: Tracer.Tracer): Effect<R, E, A>
}
```

Added in v2.0.0

## withTracerScoped

**Signature**

```ts
export declare const withTracerScoped: (value: Tracer.Tracer) => Effect<Scope.Scope, never, void>
```

Added in v2.0.0

## withTracerTiming

**Signature**

```ts
export declare const withTracerTiming: {
  (enabled: boolean): <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
  <R, E, A>(effect: Effect<R, E, A>, enabled: boolean): Effect<R, E, A>
}
```

Added in v2.0.0

# type lambdas

## EffectTypeLambda (interface)

**Signature**

```ts
export interface EffectTypeLambda extends TypeLambda {
  readonly type: Effect<this['Out2'], this['Out1'], this['Target']>
}
```

Added in v2.0.0

# unify

## unified

Used to unify effects that would otherwise be `Effect<A, B, C> | Effect<D, E, F>`

**Signature**

```ts
export declare const unified: <Ret extends Effect<any, any, any>>(f: Ret) => Effect.Unify<Ret>
```

Added in v2.0.0

## unifiedFn

Used to unify functions that would otherwise return `Effect<A, B, C> | Effect<D, E, F>`

**Signature**

```ts
export declare const unifiedFn: <Args extends readonly any[], Ret extends Effect<any, any, any>>(
  f: (...args: Args) => Ret
) => (...args: Args) => Effect.Unify<Ret>
```

Added in v2.0.0

# utils

## All (namespace)

Added in v2.0.0

### EffectAny (type alias)

**Signature**

```ts
export type EffectAny = Effect<any, any, any>
```

Added in v2.0.0

### ExtractMode (type alias)

**Signature**

```ts
export type ExtractMode<A> = [A] extends [{ mode: infer M }] ? M : 'default'
```

Added in v2.0.0

### IsDiscard (type alias)

**Signature**

```ts
export type IsDiscard<A> = [Extract<A, { readonly discard: true }>] extends [never] ? false : true
```

Added in v2.0.0

### Return (type alias)

**Signature**

```ts
export type Return<
  Arg extends Iterable<EffectAny> | Record<string, EffectAny>,
  O extends {
    readonly concurrency?: Concurrency
    readonly batching?: boolean | 'inherit'
    readonly discard?: boolean
    readonly mode?: 'default' | 'validate' | 'either'
  }
> = [Arg] extends [ReadonlyArray<EffectAny>]
  ? ReturnTuple<Arg, IsDiscard<O>, ExtractMode<O>>
  : [Arg] extends [Iterable<EffectAny>]
  ? ReturnIterable<Arg, IsDiscard<O>, ExtractMode<O>>
  : [Arg] extends [Record<string, EffectAny>]
  ? ReturnObject<Arg, IsDiscard<O>, ExtractMode<O>>
  : never
```

Added in v2.0.0

### ReturnIterable (type alias)

**Signature**

```ts
export type ReturnIterable<T extends Iterable<EffectAny>, Discard extends boolean, Mode> = [T] extends [
  Iterable<Effect.Variance<infer R, infer E, infer A>>
]
  ? Effect<
      R,
      Mode extends 'either' ? never : Mode extends 'validate' ? Array<Option.Option<E>> : E,
      Discard extends true ? void : Mode extends 'either' ? Array<Either.Either<E, A>> : Array<A>
    >
  : never
```

Added in v2.0.0

### ReturnObject (type alias)

**Signature**

```ts
export type ReturnObject<T, Discard extends boolean, Mode> = [T] extends [{ [K: string]: EffectAny }]
  ? Effect<
      keyof T extends never
        ? never
        : [T[keyof T]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }]
        ? R
        : never,
      Mode extends 'either'
        ? never
        : keyof T extends never
        ? never
        : Mode extends 'validate'
        ? {
            -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>]
              ? Option.Option<_E>
              : never
          }
        : [T[keyof T]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }]
        ? E
        : never,
      Discard extends true
        ? void
        : Mode extends 'either'
        ? {
            -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>]
              ? Either.Either<_E, _A>
              : never
          }
        : { -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>] ? _A : never }
    >
  : never
```

Added in v2.0.0

### ReturnTuple (type alias)

**Signature**

```ts
export type ReturnTuple<T extends ReadonlyArray<unknown>, Discard extends boolean, Mode> = Effect<
  T[number] extends never ? never : [T[number]] extends [{ [EffectTypeId]: { _R: (_: never) => infer R } }] ? R : never,
  Mode extends 'either'
    ? never
    : T[number] extends never
    ? never
    : Mode extends 'validate'
    ? {
        -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>]
          ? Option.Option<_E>
          : never
      }
    : [T[number]] extends [{ [EffectTypeId]: { _E: (_: never) => infer E } }]
    ? E
    : never,
  Discard extends true
    ? void
    : T[number] extends never
    ? []
    : Mode extends 'either'
    ? {
        -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>]
          ? Either.Either<_E, _A>
          : never
      }
    : { -readonly [K in keyof T]: [T[K]] extends [Effect.Variance<infer _R, infer _E, infer _A>] ? _A : never }
> extends infer X
  ? X
  : never
```

Added in v2.0.0

## Effect (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<R, E, A> {
  readonly [EffectTypeId]: VarianceStruct<R, E, A>
}
```

Added in v2.0.0

### VarianceStruct (interface)

**Signature**

```ts
export interface VarianceStruct<R, E, A> {
  readonly _V: string
  readonly _R: (_: never) => R
  readonly _E: (_: never) => E
  readonly _A: (_: never) => A
}
```

Added in v2.0.0

### Context (type alias)

**Signature**

```ts
export type Context<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _R : never
```

Added in v2.0.0

### Error (type alias)

**Signature**

```ts
export type Error<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _E : never
```

Added in v2.0.0

### Success (type alias)

**Signature**

```ts
export type Success<T extends Effect<any, any, any>> = [T] extends [Effect<infer _R, infer _E, infer _A>] ? _A : never
```

Added in v2.0.0

### Unify (type alias)

**Signature**

```ts
export type Unify<Ret extends Effect<any, any, any>> = Effect<Context<Ret>, Error<Ret>, Success<Ret>>
```

Added in v2.0.0

## MergeRecord (type alias)

**Signature**

```ts
export type MergeRecord<K, H> = {
  [k in keyof K | keyof H]: k extends keyof K ? K[k] : k extends keyof H ? H[k] : never
} extends infer X
  ? X
  : never
```

Added in v2.0.0

## withMaxOpsBeforeYield

Sets the maximum number of operations before yield by the default schedulers

**Signature**

```ts
export declare const withMaxOpsBeforeYield: {
  (priority: number): <R, E, B>(self: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(self: Effect<R, E, B>, priority: number): Effect<R, E, B>
}
```

Added in v2.0.0

## withSchedulingPriority

Sets the scheduling priority used when yielding

**Signature**

```ts
export declare const withSchedulingPriority: {
  (priority: number): <R, E, B>(self: Effect<R, E, B>) => Effect<R, E, B>
  <R, E, B>(self: Effect<R, E, B>, priority: number): Effect<R, E, B>
}
```

Added in v2.0.0

# zipping

## validate

Sequentially zips the this result with the specified result. Combines both
`Cause`s when both effects fail.

**Signature**

```ts
export declare const validate: {
  <R1, E1, B>(
    that: Effect<R1, E1, B>,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, [A, B]>
  <R, E, A, R1, E1, B>(
    self: Effect<R, E, A>,
    that: Effect<R1, E1, B>,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): Effect<R | R1, E | E1, [A, B]>
}
```

Added in v2.0.0

## validateWith

Sequentially zips this effect with the specified effect using the specified
combiner function. Combines the causes in case both effect fail.

**Signature**

```ts
export declare const validateWith: {
  <A, R1, E1, B, C>(
    that: Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): <R, E>(self: Effect<R, E, A>) => Effect<R1 | R, E1 | E, C>
  <R, E, A, R1, E1, B, C>(
    self: Effect<R, E, A>,
    that: Effect<R1, E1, B>,
    f: (a: A, b: B) => C,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): Effect<R | R1, E | E1, C>
}
```

Added in v2.0.0

## zip

**Signature**

```ts
export declare const zip: {
  <R2, E2, A2>(
    that: Effect<R2, E2, A2>,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, [A, A2]>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    that: Effect<R2, E2, A2>,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): Effect<R | R2, E | E2, [A, A2]>
}
```

Added in v2.0.0

## zipLeft

**Signature**

```ts
export declare const zipLeft: {
  <R2, E2, A2>(
    that: Effect<R2, E2, A2>,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    that: Effect<R2, E2, A2>,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): Effect<R | R2, E | E2, A>
}
```

Added in v2.0.0

## zipRight

**Signature**

```ts
export declare const zipRight: {
  <R2, E2, A2>(
    that: Effect<R2, E2, A2>,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): <R, E, A>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Effect<R, E, A>,
    that: Effect<R2, E2, A2>,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): Effect<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## zipWith

**Signature**

```ts
export declare const zipWith: {
  <R2, E2, A2, A, B>(
    that: Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): <R, E>(self: Effect<R, E, A>) => Effect<R2 | R, E2 | E, B>
  <R, E, A, R2, E2, A2, B>(
    self: Effect<R, E, A>,
    that: Effect<R2, E2, A2>,
    f: (a: A, b: A2) => B,
    options?: { readonly concurrent?: boolean; readonly batching?: boolean | 'inherit' }
  ): Effect<R | R2, E | E2, B>
}
```

Added in v2.0.0
