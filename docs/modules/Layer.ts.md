---
title: Layer.ts
nav_order: 47
parent: Modules
---

## Layer overview

A `Layer<RIn, E, ROut>` describes how to build one or more services in your
application. Services can be injected into effects via
`Effect.provideService`. Effects can require services via `Effect.service`.

Layer can be thought of as recipes for producing bundles of services, given
their dependencies (other services).

Construction of services can be effectful and utilize resources that must be
acquired and safely released when the services are done being utilized.

By default layers are shared, meaning that if the same layer is used twice
the layer will only be allocated a single time.

Because of their excellent composition properties, layers are the idiomatic
way in Effect-TS to create services that depend on other services.

Added in v2.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [clock](#clock)
  - [setClock](#setclock)
- [config](#config)
  - [setConfigProvider](#setconfigprovider)
- [constructors](#constructors)
  - [context](#context)
  - [die](#die)
  - [dieSync](#diesync)
  - [effect](#effect)
  - [effectContext](#effectcontext)
  - [effectDiscard](#effectdiscard)
  - [fail](#fail)
  - [failCause](#failcause)
  - [failCauseSync](#failcausesync)
  - [failSync](#failsync)
  - [function](#function)
  - [scope](#scope)
  - [scoped](#scoped)
  - [scopedContext](#scopedcontext)
  - [scopedDiscard](#scopeddiscard)
  - [service](#service)
  - [succeed](#succeed)
  - [succeedContext](#succeedcontext)
  - [suspend](#suspend)
  - [sync](#sync)
  - [syncContext](#synccontext)
- [conversions](#conversions)
  - [launch](#launch)
  - [toRuntime](#toruntime)
- [destructors](#destructors)
  - [build](#build)
  - [buildWithScope](#buildwithscope)
- [error handling](#error-handling)
  - [catchAll](#catchall)
  - [catchAllCause](#catchallcause)
  - [orDie](#ordie)
  - [orElse](#orelse)
- [folding](#folding)
  - [match](#match)
  - [matchCause](#matchcause)
- [getters](#getters)
  - [isFresh](#isfresh)
  - [isLayer](#islayer)
- [logging](#logging)
  - [setUnhandledErrorLogLevel](#setunhandlederrorloglevel)
- [mapping](#mapping)
  - [discard](#discard)
  - [map](#map)
  - [mapError](#maperror)
- [memo map](#memo-map)
  - [buildWithMemoMap](#buildwithmemomap)
  - [makeMemoMap](#makememomap)
- [models](#models)
  - [Layer (interface)](#layer-interface)
  - [MemoMap (interface)](#memomap-interface)
- [requests & batching](#requests--batching)
  - [setRequestBatching](#setrequestbatching)
  - [setRequestCache](#setrequestcache)
  - [setRequestCaching](#setrequestcaching)
- [retrying](#retrying)
  - [retry](#retry)
- [scheduler](#scheduler)
  - [setScheduler](#setscheduler)
- [sequencing](#sequencing)
  - [flatMap](#flatmap)
  - [flatten](#flatten)
  - [tap](#tap)
  - [tapError](#taperror)
  - [tapErrorCause](#taperrorcause)
- [symbols](#symbols)
  - [LayerTypeId](#layertypeid)
  - [LayerTypeId (type alias)](#layertypeid-type-alias)
  - [MemoMapTypeId](#memomaptypeid)
  - [MemoMapTypeId (type alias)](#memomaptypeid-type-alias)
- [tracing](#tracing)
  - [parentSpan](#parentspan)
  - [setTracer](#settracer)
  - [setTracerTiming](#settracertiming)
  - [span](#span)
  - [withParentSpan](#withparentspan)
  - [withSpan](#withspan)
- [utils](#utils)
  - [Layer (namespace)](#layer-namespace)
    - [Variance (interface)](#variance-interface)
    - [Context (type alias)](#context-type-alias)
    - [Error (type alias)](#error-type-alias)
    - [Success (type alias)](#success-type-alias)
  - [extendScope](#extendscope)
  - [fiberRefLocallyScopedWith](#fiberreflocallyscopedwith)
  - [fresh](#fresh)
  - [locally](#locally)
  - [locallyEffect](#locallyeffect)
  - [locallyScoped](#locallyscoped)
  - [locallyWith](#locallywith)
  - [memoize](#memoize)
  - [passthrough](#passthrough)
  - [project](#project)
  - [provide](#provide)
  - [provideMerge](#providemerge)
  - [unwrapEffect](#unwrapeffect)
  - [unwrapScoped](#unwrapscoped)
- [zipping](#zipping)
  - [merge](#merge)
  - [mergeAll](#mergeall)
  - [zipWith](#zipwith)

---

# clock

## setClock

**Signature**

```ts
export declare const setClock: <A extends Clock.Clock>(clock: A) => Layer<never, never, never>
```

Added in v2.0.0

# config

## setConfigProvider

Sets the current `ConfigProvider`.

**Signature**

```ts
export declare const setConfigProvider: (configProvider: ConfigProvider) => Layer<never, never, never>
```

Added in v2.0.0

# constructors

## context

Constructs a `Layer` that passes along the specified context as an
output.

**Signature**

```ts
export declare const context: <R>() => Layer<R, never, R>
```

Added in v2.0.0

## die

Constructs a layer that dies with the specified defect.

**Signature**

```ts
export declare const die: (defect: unknown) => Layer<never, never, unknown>
```

Added in v2.0.0

## dieSync

Constructs a layer that dies with the specified defect.

**Signature**

```ts
export declare const dieSync: (evaluate: LazyArg<unknown>) => Layer<never, never, unknown>
```

Added in v2.0.0

## effect

Constructs a layer from the specified effect.

**Signature**

```ts
export declare const effect: {
  <T extends Context.Tag<any, any>>(
    tag: T
  ): <R, E>(effect: Effect.Effect<R, E, Context.Tag.Service<T>>) => Layer<R, E, Context.Tag.Identifier<T>>
  <T extends Context.Tag<any, any>, R, E>(
    tag: T,
    effect: Effect.Effect<R, E, Context.Tag.Service<T>>
  ): Layer<R, E, Context.Tag.Identifier<T>>
}
```

Added in v2.0.0

## effectContext

Constructs a layer from the specified effect, which must return one or more
services.

**Signature**

```ts
export declare const effectContext: <R, E, A>(effect: Effect.Effect<R, E, Context.Context<A>>) => Layer<R, E, A>
```

Added in v2.0.0

## effectDiscard

Constructs a layer from the specified effect discarding it's output.

**Signature**

```ts
export declare const effectDiscard: <R, E, _>(effect: Effect.Effect<R, E, _>) => Layer<R, E, never>
```

Added in v2.0.0

## fail

Constructs a layer that fails with the specified error.

**Signature**

```ts
export declare const fail: <E>(error: E) => Layer<never, E, unknown>
```

Added in v2.0.0

## failCause

Constructs a layer that fails with the specified cause.

**Signature**

```ts
export declare const failCause: <E>(cause: Cause.Cause<E>) => Layer<never, E, unknown>
```

Added in v2.0.0

## failCauseSync

Constructs a layer that fails with the specified cause.

**Signature**

```ts
export declare const failCauseSync: <E>(evaluate: LazyArg<Cause.Cause<E>>) => Layer<never, E, unknown>
```

Added in v2.0.0

## failSync

Constructs a layer that fails with the specified error.

**Signature**

```ts
export declare const failSync: <E>(evaluate: LazyArg<E>) => Layer<never, E, unknown>
```

Added in v2.0.0

## function

Constructs a layer from the context using the specified function.

**Signature**

```ts
export declare const function: <A extends Context.Tag<any, any>, B extends Context.Tag<any, any>>(tagA: A, tagB: B, f: (a: Context.Tag.Service<A>) => Context.Tag.Service<B>) => Layer<Context.Tag.Identifier<A>, never, Context.Tag.Identifier<B>>
```

Added in v2.0.0

## scope

A layer that constructs a scope and closes it when the workflow the layer
is provided to completes execution, whether by success, failure, or
interruption. This can be used to close a scope when providing a layer to a
workflow.

**Signature**

```ts
export declare const scope: Layer<never, never, Scope.CloseableScope>
```

Added in v2.0.0

## scoped

Constructs a layer from the specified scoped effect.

**Signature**

```ts
export declare const scoped: {
  <T extends Context.Tag<any, any>>(
    tag: T
  ): <R, E>(
    effect: Effect.Effect<R, E, Context.Tag.Service<T>>
  ) => Layer<Exclude<R, Scope.Scope>, E, Context.Tag.Identifier<T>>
  <T extends Context.Tag<any, any>, R, E>(
    tag: T,
    effect: Effect.Effect<R, E, Context.Tag.Service<T>>
  ): Layer<Exclude<R, Scope.Scope>, E, Context.Tag.Identifier<T>>
}
```

Added in v2.0.0

## scopedContext

Constructs a layer from the specified scoped effect, which must return one
or more services.

**Signature**

```ts
export declare const scopedContext: <R, E, A>(
  effect: Effect.Effect<R, E, Context.Context<A>>
) => Layer<Exclude<R, Scope.Scope>, E, A>
```

Added in v2.0.0

## scopedDiscard

Constructs a layer from the specified scoped effect.

**Signature**

```ts
export declare const scopedDiscard: <R, E, T>(
  effect: Effect.Effect<R, E, T>
) => Layer<Exclude<R, Scope.Scope>, E, never>
```

Added in v2.0.0

## service

Constructs a layer that accesses and returns the specified service from the
context.

**Signature**

```ts
export declare const service: <T extends Context.Tag<any, any>>(
  tag: T
) => Layer<Context.Tag.Identifier<T>, never, Context.Tag.Identifier<T>>
```

Added in v2.0.0

## succeed

Constructs a layer from the specified value.

**Signature**

```ts
export declare const succeed: {
  <T extends Context.Tag<any, any>>(
    tag: T
  ): (resource: Context.Tag.Service<T>) => Layer<never, never, Context.Tag.Identifier<T>>
  <T extends Context.Tag<any, any>>(
    tag: T,
    resource: Context.Tag.Service<T>
  ): Layer<never, never, Context.Tag.Identifier<T>>
}
```

Added in v2.0.0

## succeedContext

Constructs a layer from the specified value, which must return one or more
services.

**Signature**

```ts
export declare const succeedContext: <A>(context: Context.Context<A>) => Layer<never, never, A>
```

Added in v2.0.0

## suspend

Lazily constructs a layer. This is useful to avoid infinite recursion when
creating layers that refer to themselves.

**Signature**

```ts
export declare const suspend: <RIn, E, ROut>(evaluate: LazyArg<Layer<RIn, E, ROut>>) => Layer<RIn, E, ROut>
```

Added in v2.0.0

## sync

Lazily constructs a layer from the specified value.

**Signature**

```ts
export declare const sync: {
  <T extends Context.Tag<any, any>>(
    tag: T
  ): (evaluate: LazyArg<Context.Tag.Service<T>>) => Layer<never, never, Context.Tag.Identifier<T>>
  <T extends Context.Tag<any, any>>(
    tag: T,
    evaluate: LazyArg<Context.Tag.Service<T>>
  ): Layer<never, never, Context.Tag.Identifier<T>>
}
```

Added in v2.0.0

## syncContext

Lazily constructs a layer from the specified value, which must return one or more
services.

**Signature**

```ts
export declare const syncContext: <A>(evaluate: LazyArg<Context.Context<A>>) => Layer<never, never, A>
```

Added in v2.0.0

# conversions

## launch

Builds this layer and uses it until it is interrupted. This is useful when
your entire application is a layer, such as an HTTP server.

**Signature**

```ts
export declare const launch: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, never>
```

Added in v2.0.0

## toRuntime

Converts a layer that requires no services into a scoped runtime, which can
be used to execute effects.

**Signature**

```ts
export declare const toRuntime: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope | RIn, E, Runtime.Runtime<ROut>>
```

Added in v2.0.0

# destructors

## build

Builds a layer into a scoped value.

**Signature**

```ts
export declare const build: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope | RIn, E, Context.Context<ROut>>
```

Added in v2.0.0

## buildWithScope

Builds a layer into an `Effect` value. Any resources associated with this
layer will be released when the specified scope is closed unless their scope
has been extended. This allows building layers where the lifetime of some of
the services output by the layer exceed the lifetime of the effect the
layer is provided to.

**Signature**

```ts
export declare const buildWithScope: {
  (scope: Scope.Scope): <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, Context.Context<ROut>>
  <RIn, E, ROut>(self: Layer<RIn, E, ROut>, scope: Scope.Scope): Effect.Effect<RIn, E, Context.Context<ROut>>
}
```

Added in v2.0.0

# error handling

## catchAll

Recovers from all errors.

**Signature**

```ts
export declare const catchAll: {
  <E, R2, E2, A2>(onError: (error: E) => Layer<R2, E2, A2>): <R, A>(self: Layer<R, E, A>) => Layer<R2 | R, E2, A & A2>
  <R, E, A, R2, E2, A2>(self: Layer<R, E, A>, onError: (error: E) => Layer<R2, E2, A2>): Layer<R | R2, E2, A & A2>
}
```

Added in v2.0.0

## catchAllCause

Recovers from all errors.

**Signature**

```ts
export declare const catchAllCause: {
  <E, R2, E2, A2>(
    onError: (cause: Cause.Cause<E>) => Layer<R2, E2, A2>
  ): <R, A>(self: Layer<R, E, A>) => Layer<R2 | R, E2, A & A2>
  <R, E, A, R2, E2, A2>(
    self: Layer<R, E, A>,
    onError: (cause: Cause.Cause<E>) => Layer<R2, E2, A2>
  ): Layer<R | R2, E2, A & A2>
}
```

Added in v2.0.0

## orDie

Translates effect failure into death of the fiber, making all failures
unchecked and not a part of the type of the layer.

**Signature**

```ts
export declare const orDie: <R, E, A>(self: Layer<R, E, A>) => Layer<R, never, A>
```

Added in v2.0.0

## orElse

Executes this layer and returns its output, if it succeeds, but otherwise
executes the specified layer.

**Signature**

```ts
export declare const orElse: {
  <R2, E2, A2>(that: LazyArg<Layer<R2, E2, A2>>): <R, E, A>(self: Layer<R, E, A>) => Layer<R2 | R, E2 | E, A & A2>
  <R, E, A, R2, E2, A2>(self: Layer<R, E, A>, that: LazyArg<Layer<R2, E2, A2>>): Layer<R | R2, E | E2, A & A2>
}
```

Added in v2.0.0

# folding

## match

Feeds the error or output services of this layer into the input of either
the specified `failure` or `success` layers, resulting in a new layer with
the inputs of this layer, and the error or outputs of the specified layer.

**Signature**

```ts
export declare const match: {
  <E, R2, E2, A2, A, R3, E3, A3>(options: {
    readonly onFailure: (error: E) => Layer<R2, E2, A2>
    readonly onSuccess: (context: Context.Context<A>) => Layer<R3, E3, A3>
  }): <R>(self: Layer<R, E, A>) => Layer<R2 | R3 | R, E2 | E3, A2 & A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Layer<R, E, A>,
    options: {
      readonly onFailure: (error: E) => Layer<R2, E2, A2>
      readonly onSuccess: (context: Context.Context<A>) => Layer<R3, E3, A3>
    }
  ): Layer<R | R2 | R3, E2 | E3, A2 & A3>
}
```

Added in v2.0.0

## matchCause

Feeds the error or output services of this layer into the input of either
the specified `failure` or `success` layers, resulting in a new layer with
the inputs of this layer, and the error or outputs of the specified layer.

**Signature**

```ts
export declare const matchCause: {
  <E, A, R2, E2, A2, R3, E3, A3>(options: {
    readonly onFailure: (cause: Cause.Cause<E>) => Layer<R2, E2, A2>
    readonly onSuccess: (context: Context.Context<A>) => Layer<R3, E3, A3>
  }): <R>(self: Layer<R, E, A>) => Layer<R2 | R3 | R, E2 | E3, A2 & A3>
  <R, E, A, R2, E2, A2, R3, E3, A3>(
    self: Layer<R, E, A>,
    options: {
      readonly onFailure: (cause: Cause.Cause<E>) => Layer<R2, E2, A2>
      readonly onSuccess: (context: Context.Context<A>) => Layer<R3, E3, A3>
    }
  ): Layer<R | R2 | R3, E2 | E3, A2 & A3>
}
```

Added in v2.0.0

# getters

## isFresh

Returns `true` if the specified `Layer` is a fresh version that will not be
shared, `false` otherwise.

**Signature**

```ts
export declare const isFresh: <R, E, A>(self: Layer<R, E, A>) => boolean
```

Added in v2.0.0

## isLayer

Returns `true` if the specified value is a `Layer`, `false` otherwise.

**Signature**

```ts
export declare const isLayer: (u: unknown) => u is Layer<unknown, unknown, unknown>
```

Added in v2.0.0

# logging

## setUnhandledErrorLogLevel

**Signature**

```ts
export declare const setUnhandledErrorLogLevel: (level: Option.Option<LogLevel>) => Layer<never, never, never>
```

Added in v2.0.0

# mapping

## discard

Replaces the layer's output with `void` and includes the layer only for its
side-effects.

**Signature**

```ts
export declare const discard: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn, E, never>
```

Added in v2.0.0

## map

Returns a new layer whose output is mapped by the specified function.

**Signature**

```ts
export declare const map: {
  <A, B>(f: (context: Context.Context<A>) => Context.Context<B>): <R, E>(self: Layer<R, E, A>) => Layer<R, E, B>
  <R, E, A, B>(self: Layer<R, E, A>, f: (context: Context.Context<A>) => Context.Context<B>): Layer<R, E, B>
}
```

Added in v2.0.0

## mapError

Returns a layer with its error channel mapped using the specified function.

**Signature**

```ts
export declare const mapError: {
  <E, E2>(f: (error: E) => E2): <R, A>(self: Layer<R, E, A>) => Layer<R, E2, A>
  <R, E, A, E2>(self: Layer<R, E, A>, f: (error: E) => E2): Layer<R, E2, A>
}
```

Added in v2.0.0

# memo map

## buildWithMemoMap

Builds a layer into an `Effect` value, using the specified `MemoMap` to memoize
the layer construction.

**Signature**

```ts
export declare const buildWithMemoMap: {
  (
    memoMap: MemoMap,
    scope: Scope.Scope
  ): <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Effect.Effect<RIn, E, Context.Context<ROut>>
  <RIn, E, ROut>(
    self: Layer<RIn, E, ROut>,
    memoMap: MemoMap,
    scope: Scope.Scope
  ): Effect.Effect<RIn, E, Context.Context<ROut>>
}
```

Added in v2.0.0

## makeMemoMap

Constructs a `MemoMap` that can be used to build additional layers.

**Signature**

```ts
export declare const makeMemoMap: Effect.Effect<never, never, MemoMap>
```

Added in v2.0.0

# models

## Layer (interface)

**Signature**

```ts
export interface Layer<out RIn, out E, in ROut> extends Layer.Variance<RIn, E, ROut>, Pipeable {}
```

Added in v2.0.0

## MemoMap (interface)

**Signature**

```ts
export interface MemoMap {
  readonly [MemoMapTypeId]: MemoMapTypeId

  /** @internal */
  readonly getOrElseMemoize: <RIn, E, ROut>(
    layer: Layer<RIn, E, ROut>,
    scope: Scope.Scope
  ) => Effect.Effect<RIn, E, Context.Context<ROut>>
}
```

Added in v2.0.0

# requests & batching

## setRequestBatching

**Signature**

```ts
export declare const setRequestBatching: (requestBatching: boolean) => Layer<never, never, never>
```

Added in v2.0.0

## setRequestCache

**Signature**

```ts
export declare const setRequestCache: {
  <R, E>(cache: Effect.Effect<R, E, Request.Cache>): Layer<Exclude<R, Scope.Scope>, E, never>
  (cache: Request.Cache): Layer<never, never, never>
}
```

Added in v2.0.0

## setRequestCaching

**Signature**

```ts
export declare const setRequestCaching: (requestCaching: boolean) => Layer<never, never, never>
```

Added in v2.0.0

# retrying

## retry

Retries constructing this layer according to the specified schedule.

**Signature**

```ts
export declare const retry: {
  <RIn2, E, X>(
    schedule: Schedule.Schedule<RIn2, E, X>
  ): <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E, ROut>
  <RIn, E, ROut, RIn2, X>(
    self: Layer<RIn, E, ROut>,
    schedule: Schedule.Schedule<RIn2, E, X>
  ): Layer<RIn | RIn2, E, ROut>
}
```

Added in v2.0.0

# scheduler

## setScheduler

**Signature**

```ts
export declare const setScheduler: (scheduler: Scheduler.Scheduler) => Layer<never, never, never>
```

Added in v2.0.0

# sequencing

## flatMap

Constructs a layer dynamically based on the output of this layer.

**Signature**

```ts
export declare const flatMap: {
  <A, R2, E2, A2>(
    f: (context: Context.Context<A>) => Layer<R2, E2, A2>
  ): <R, E>(self: Layer<R, E, A>) => Layer<R2 | R, E2 | E, A2>
  <R, E, A, R2, E2, A2>(
    self: Layer<R, E, A>,
    f: (context: Context.Context<A>) => Layer<R2, E2, A2>
  ): Layer<R | R2, E | E2, A2>
}
```

Added in v2.0.0

## flatten

Flattens layers nested in the context of an effect.

**Signature**

```ts
export declare const flatten: {
  <R2, E2, A, I>(tag: Context.Tag<I, Layer<R2, E2, A>>): <R, E>(self: Layer<R, E, I>) => Layer<R2 | R, E2 | E, A>
  <R, E, A, R2, E2, I>(self: Layer<R, E, I>, tag: Context.Tag<I, Layer<R2, E2, A>>): Layer<R | R2, E | E2, A>
}
```

Added in v2.0.0

## tap

Performs the specified effect if this layer succeeds.

**Signature**

```ts
export declare const tap: {
  <ROut, XR extends ROut, RIn2, E2, X>(
    f: (context: Context.Context<XR>) => Effect.Effect<RIn2, E2, X>
  ): <RIn, E>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E2 | E, ROut>
  <RIn, E, ROut, XR extends ROut, RIn2, E2, X>(
    self: Layer<RIn, E, ROut>,
    f: (context: Context.Context<XR>) => Effect.Effect<RIn2, E2, X>
  ): Layer<RIn | RIn2, E | E2, ROut>
}
```

Added in v2.0.0

## tapError

Performs the specified effect if this layer fails.

**Signature**

```ts
export declare const tapError: {
  <E, XE extends E, RIn2, E2, X>(
    f: (e: XE) => Effect.Effect<RIn2, E2, X>
  ): <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E | E2, ROut>
  <RIn, E, XE extends E, ROut, RIn2, E2, X>(
    self: Layer<RIn, E, ROut>,
    f: (e: XE) => Effect.Effect<RIn2, E2, X>
  ): Layer<RIn | RIn2, E | E2, ROut>
}
```

Added in v2.0.0

## tapErrorCause

Performs the specified effect if this layer fails.

**Signature**

```ts
export declare const tapErrorCause: {
  <E, XE extends E, RIn2, E2, X>(
    f: (cause: Cause.Cause<XE>) => Effect.Effect<RIn2, E2, X>
  ): <RIn, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn2 | RIn, E | E2, ROut>
  <RIn, E, XE extends E, ROut, RIn2, E2, X>(
    self: Layer<RIn, E, ROut>,
    f: (cause: Cause.Cause<XE>) => Effect.Effect<RIn2, E2, X>
  ): Layer<RIn | RIn2, E | E2, ROut>
}
```

Added in v2.0.0

# symbols

## LayerTypeId

**Signature**

```ts
export declare const LayerTypeId: typeof LayerTypeId
```

Added in v2.0.0

## LayerTypeId (type alias)

**Signature**

```ts
export type LayerTypeId = typeof LayerTypeId
```

Added in v2.0.0

## MemoMapTypeId

**Signature**

```ts
export declare const MemoMapTypeId: typeof MemoMapTypeId
```

Added in v2.0.0

## MemoMapTypeId (type alias)

**Signature**

```ts
export type MemoMapTypeId = typeof MemoMapTypeId
```

Added in v2.0.0

# tracing

## parentSpan

Adds the provided span to the span stack.

**Signature**

```ts
export declare const parentSpan: (span: Tracer.ParentSpan) => Layer<never, never, Tracer.ParentSpan>
```

Added in v2.0.0

## setTracer

Create a Layer that sets the current Tracer

**Signature**

```ts
export declare const setTracer: (tracer: Tracer.Tracer) => Layer<never, never, never>
```

Added in v2.0.0

## setTracerTiming

**Signature**

```ts
export declare const setTracerTiming: (enabled: boolean) => Layer<never, never, never>
```

Added in v2.0.0

## span

Create and add a span to the current span stack.

The span is ended when the Layer is released.

**Signature**

```ts
export declare const span: (
  name: string,
  options?:
    | {
        readonly attributes?: Record<string, unknown> | undefined
        readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
        readonly parent?: Tracer.ParentSpan | undefined
        readonly root?: boolean | undefined
        readonly context?: Context.Context<never> | undefined
        readonly onEnd?:
          | ((span: Tracer.Span, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>)
          | undefined
      }
    | undefined
) => Layer<never, never, Tracer.ParentSpan>
```

Added in v2.0.0

## withParentSpan

**Signature**

```ts
export declare const withParentSpan: {
  (span: Tracer.ParentSpan): <R, E, A>(self: Layer<R, E, A>) => Layer<Exclude<R, Tracer.ParentSpan>, E, A>
  <R, E, A>(self: Layer<R, E, A>, span: Tracer.ParentSpan): Layer<Exclude<R, Tracer.ParentSpan>, E, A>
}
```

Added in v2.0.0

## withSpan

**Signature**

```ts
export declare const withSpan: {
  (
    name: string,
    options?:
      | {
          readonly attributes?: Record<string, unknown> | undefined
          readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
          readonly parent?: Tracer.ParentSpan | undefined
          readonly root?: boolean | undefined
          readonly context?: Context.Context<never> | undefined
          readonly onEnd?:
            | ((span: Tracer.Span, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>)
            | undefined
        }
      | undefined
  ): <R, E, A>(self: Layer<R, E, A>) => Layer<Exclude<R, Tracer.ParentSpan>, E, A>
  <R, E, A>(
    self: Layer<R, E, A>,
    name: string,
    options?:
      | {
          readonly attributes?: Record<string, unknown> | undefined
          readonly links?: ReadonlyArray<Tracer.SpanLink> | undefined
          readonly parent?: Tracer.ParentSpan | undefined
          readonly root?: boolean | undefined
          readonly context?: Context.Context<never> | undefined
          readonly onEnd?:
            | ((span: Tracer.Span, exit: Exit.Exit<unknown, unknown>) => Effect.Effect<never, never, void>)
            | undefined
        }
      | undefined
  ): Layer<Exclude<R, Tracer.ParentSpan>, E, A>
}
```

Added in v2.0.0

# utils

## Layer (namespace)

Added in v2.0.0

### Variance (interface)

**Signature**

```ts
export interface Variance<out RIn, out E, in ROut> {
  readonly [LayerTypeId]: {
    readonly _RIn: Types.Covariant<RIn>
    readonly _E: Types.Covariant<E>
    readonly _ROut: Types.Contravariant<ROut>
  }
}
```

Added in v2.0.0

### Context (type alias)

**Signature**

```ts
export type Context<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _R : never
```

Added in v2.0.0

### Error (type alias)

**Signature**

```ts
export type Error<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _E : never
```

Added in v2.0.0

### Success (type alias)

**Signature**

```ts
export type Success<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _A : never
```

Added in v2.0.0

## extendScope

Extends the scope of this layer, returning a new layer that when provided
to an effect will not immediately release its associated resources when
that effect completes execution but instead when the scope the resulting
effect depends on is closed.

**Signature**

```ts
export declare const extendScope: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<Scope.Scope | RIn, E, ROut>
```

Added in v2.0.0

## fiberRefLocallyScopedWith

**Signature**

```ts
export declare const fiberRefLocallyScopedWith: <A>(self: FiberRef<A>, value: (_: A) => A) => Layer<never, never, never>
```

Added in v2.0.0

## fresh

Creates a fresh version of this layer that will not be shared.

**Signature**

```ts
export declare const fresh: <R, E, A>(self: Layer<R, E, A>) => Layer<R, E, A>
```

Added in v2.0.0

## locally

**Signature**

```ts
export declare const locally: {
  <X>(ref: FiberRef<X>, value: X): <R, E, A>(self: Layer<R, E, A>) => Layer<R, E, A>
  <R, E, A, X>(self: Layer<R, E, A>, ref: FiberRef<X>, value: X): Layer<R, E, A>
}
```

Added in v2.0.0

## locallyEffect

**Signature**

```ts
export declare const locallyEffect: {
  <RIn, E, ROut, RIn2, E2, ROut2>(
    f: (_: Effect.Effect<RIn, E, Context.Context<ROut>>) => Effect.Effect<RIn2, E2, Context.Context<ROut2>>
  ): (self: Layer<RIn, E, ROut>) => Layer<RIn2, E2, ROut2>
  <RIn, E, ROut, RIn2, E2, ROut2>(
    self: Layer<RIn, E, ROut>,
    f: (_: Effect.Effect<RIn, E, Context.Context<ROut>>) => Effect.Effect<RIn2, E2, Context.Context<ROut2>>
  ): Layer<RIn2, E2, ROut2>
}
```

Added in v2.0.0

## locallyScoped

**Signature**

```ts
export declare const locallyScoped: <A>(self: FiberRef<A>, value: A) => Layer<never, never, never>
```

Added in v2.0.0

## locallyWith

**Signature**

```ts
export declare const locallyWith: {
  <X>(ref: FiberRef<X>, value: (_: X) => X): <R, E, A>(self: Layer<R, E, A>) => Layer<R, E, A>
  <R, E, A, X>(self: Layer<R, E, A>, ref: FiberRef<X>, value: (_: X) => X): Layer<R, E, A>
}
```

Added in v2.0.0

## memoize

Returns a scoped effect that, if evaluated, will return the lazily computed
result of this layer.

**Signature**

```ts
export declare const memoize: <RIn, E, ROut>(
  self: Layer<RIn, E, ROut>
) => Effect.Effect<Scope.Scope, never, Layer<RIn, E, ROut>>
```

Added in v2.0.0

## passthrough

Returns a new layer that produces the outputs of this layer but also
passes through the inputs.

**Signature**

```ts
export declare const passthrough: <RIn, E, ROut>(self: Layer<RIn, E, ROut>) => Layer<RIn, E, RIn | ROut>
```

Added in v2.0.0

## project

Projects out part of one of the services output by this layer using the
specified function.

**Signature**

```ts
export declare const project: {
  <A extends Context.Tag<any, any>, B extends Context.Tag<any, any>>(
    tagA: A,
    tagB: B,
    f: (a: Context.Tag.Service<A>) => Context.Tag.Service<B>
  ): <RIn, E>(self: Layer<RIn, E, Context.Tag.Identifier<A>>) => Layer<RIn, E, Context.Tag.Identifier<B>>
  <RIn, E, A extends Context.Tag<any, any>, B extends Context.Tag<any, any>>(
    self: Layer<RIn, E, Context.Tag.Identifier<A>>,
    tagA: A,
    tagB: B,
    f: (a: Context.Tag.Service<A>) => Context.Tag.Service<B>
  ): Layer<RIn, E, Context.Tag.Identifier<B>>
}
```

Added in v2.0.0

## provide

Feeds the output services of this builder into the input of the specified
builder, resulting in a new builder with the inputs of this builder as
well as any leftover inputs, and the outputs of the specified builder.

**Signature**

```ts
export declare const provide: {
  <RIn, E, ROut>(
    self: Layer<RIn, E, ROut>
  ): <RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) => Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut2>
  <RIn2, E2, ROut2, RIn, E, ROut>(
    that: Layer<RIn2, E2, ROut2>,
    self: Layer<RIn, E, ROut>
  ): Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut2>
}
```

Added in v2.0.0

## provideMerge

Feeds the output services of this layer into the input of the specified
layer, resulting in a new layer with the inputs of this layer, and the
outputs of both layers.

**Signature**

```ts
export declare const provideMerge: {
  <RIn, E, ROut>(
    self: Layer<RIn, E, ROut>
  ): <RIn2, E2, ROut2>(that: Layer<RIn2, E2, ROut2>) => Layer<RIn | Exclude<RIn2, ROut>, E | E2, ROut | ROut2>
  <RIn2, E2, ROut2, RIn, E, ROut>(
    that: Layer<RIn2, E2, ROut2>,
    self: Layer<RIn, E, ROut>
  ): Layer<RIn | Exclude<RIn2, ROut>, E2 | E, ROut2 | ROut>
}
```

Added in v2.0.0

## unwrapEffect

**Signature**

```ts
export declare const unwrapEffect: <R, E, R1, E1, A>(
  self: Effect.Effect<R, E, Layer<R1, E1, A>>
) => Layer<R | R1, E | E1, A>
```

Added in v2.0.0

## unwrapScoped

**Signature**

```ts
export declare const unwrapScoped: <R, E, R1, E1, A>(
  self: Effect.Effect<R, E, Layer<R1, E1, A>>
) => Layer<R1 | Exclude<R, Scope.Scope>, E | E1, A>
```

Added in v2.0.0

# zipping

## merge

Merges this layer with the specified layer concurrently, producing a new layer with combined input and output types.

**Signature**

```ts
export declare const merge: {
  <RIn2, E2, ROut2>(
    that: Layer<RIn2, E2, ROut2>
  ): <RIn, E1, ROut>(self: Layer<RIn, E1, ROut>) => Layer<RIn2 | RIn, E2 | E1, ROut2 | ROut>
  <RIn, E1, ROut, RIn2, E2, ROut2>(
    self: Layer<RIn, E1, ROut>,
    that: Layer<RIn2, E2, ROut2>
  ): Layer<RIn | RIn2, E1 | E2, ROut | ROut2>
}
```

Added in v2.0.0

## mergeAll

Combines all the provided layers concurrently, creating a new layer with merged input, error, and output types.

**Signature**

```ts
export declare const mergeAll: <Layers extends [Layer<any, any, never>, ...Layer<any, any, never>[]]>(
  ...layers: Layers
) => Layer<
  { [k in keyof Layers]: Layer.Context<Layers[k]> }[number],
  { [k in keyof Layers]: Layer.Error<Layers[k]> }[number],
  { [k in keyof Layers]: Layer.Success<Layers[k]> }[number]
>
```

Added in v2.0.0

## zipWith

Combines this layer with the specified layer concurrently, creating a new layer with merged input types and
combined output types using the provided function.

**Signature**

```ts
export declare const zipWith: {
  <R2, E2, B, A, C>(
    that: Layer<R2, E2, B>,
    f: (a: Context.Context<A>, b: Context.Context<B>) => Context.Context<C>
  ): <R, E>(self: Layer<R, E, A>) => Layer<R2 | R, E2 | E, C>
  <R, E, R2, E2, B, A, C>(
    self: Layer<R, E, A>,
    that: Layer<R2, E2, B>,
    f: (a: Context.Context<A>, b: Context.Context<B>) => Context.Context<C>
  ): Layer<R | R2, E | E2, C>
}
```

Added in v2.0.0
