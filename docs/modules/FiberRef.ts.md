---
title: FiberRef.ts
nav_order: 29
parent: Modules
---

## FiberRef overview

Added in v1.0.0

---

<h2 class="text-delta">Table of contents</h2>

- [constructors](#constructors)
  - [make](#make)
  - [makeContext](#makecontext)
  - [makeRuntimeFlags](#makeruntimeflags)
  - [makeWith](#makewith)
  - [unsafeMake](#unsafemake)
  - [unsafeMakeContext](#unsafemakecontext)
  - [unsafeMakeHashSet](#unsafemakehashset)
  - [unsafeMakePatch](#unsafemakepatch)
  - [unsafeMakeSupervisor](#unsafemakesupervisor)
- [fiberRefs](#fiberrefs)
  - [currentContext](#currentcontext)
  - [currentLogAnnotations](#currentlogannotations)
  - [currentLogLevel](#currentloglevel)
  - [currentLogSpan](#currentlogspan)
  - [currentLoggers](#currentloggers)
  - [currentMaxOpsBeforeYield](#currentmaxopsbeforeyield)
  - [currentMetricLabels](#currentmetriclabels)
  - [currentMinimumLogLevel](#currentminimumloglevel)
  - [currentRequestBatchingEnabled](#currentrequestbatchingenabled)
  - [currentRequestCache](#currentrequestcache)
  - [currentRequestCacheEnabled](#currentrequestcacheenabled)
  - [currentRuntimeFlags](#currentruntimeflags)
  - [currentScheduler](#currentscheduler)
  - [currentSchedulingPriority](#currentschedulingpriority)
  - [currentSupervisor](#currentsupervisor)
  - [currentTracerSpan](#currenttracerspan)
  - [currentTracerSpanAnnotations](#currenttracerspanannotations)
  - [currentTracerSpanLinks](#currenttracerspanlinks)
  - [currentTracerTimingEnabled](#currenttracertimingenabled)
  - [interruptedCause](#interruptedcause)
  - [unhandledErrorLogLevel](#unhandlederrorloglevel)
- [getters](#getters)
  - [get](#get)
- [model](#model)
  - [FiberRef (interface)](#fiberref-interface)
- [models](#models)
  - [Variance (interface)](#variance-interface)
- [symbols](#symbols)
  - [FiberRefTypeId](#fiberreftypeid)
  - [FiberRefTypeId (type alias)](#fiberreftypeid-type-alias)
- [utils](#utils)
  - [delete](#delete)
  - [getAndSet](#getandset)
  - [getAndUpdate](#getandupdate)
  - [getAndUpdateSome](#getandupdatesome)
  - [getWith](#getwith)
  - [modify](#modify)
  - [modifySome](#modifysome)
  - [reset](#reset)
  - [set](#set)
  - [update](#update)
  - [updateAndGet](#updateandget)
  - [updateSome](#updatesome)
  - [updateSomeAndGet](#updatesomeandget)

---

# constructors

## make

**Signature**

```ts
export declare const make: <A>(
  initial: A,
  options?:
    | { readonly fork?: ((a: A) => A) | undefined; readonly join?: ((left: A, right: A) => A) | undefined }
    | undefined
) => Effect.Effect<Scope.Scope, never, FiberRef<A>>
```

Added in v1.0.0

## makeContext

**Signature**

```ts
export declare const makeContext: <A>(
  initial: Context.Context<A>
) => Effect.Effect<Scope.Scope, never, FiberRef<Context.Context<A>>>
```

Added in v1.0.0

## makeRuntimeFlags

**Signature**

```ts
export declare const makeRuntimeFlags: (
  initial: RuntimeFlags.RuntimeFlags
) => Effect.Effect<Scope.Scope, never, FiberRef<RuntimeFlags.RuntimeFlags>>
```

Added in v1.0.0

## makeWith

**Signature**

```ts
export declare const makeWith: <Value>(
  ref: LazyArg<FiberRef<Value>>
) => Effect.Effect<Scope.Scope, never, FiberRef<Value>>
```

Added in v1.0.0

## unsafeMake

**Signature**

```ts
export declare const unsafeMake: <Value>(
  initial: Value,
  options?:
    | {
        readonly fork?: ((a: Value) => Value) | undefined
        readonly join?: ((left: Value, right: Value) => Value) | undefined
      }
    | undefined
) => FiberRef<Value>
```

Added in v1.0.0

## unsafeMakeContext

**Signature**

```ts
export declare const unsafeMakeContext: <A>(initial: Context.Context<A>) => FiberRef<Context.Context<A>>
```

Added in v1.0.0

## unsafeMakeHashSet

**Signature**

```ts
export declare const unsafeMakeHashSet: <A>(initial: HashSet.HashSet<A>) => FiberRef<HashSet.HashSet<A>>
```

Added in v1.0.0

## unsafeMakePatch

**Signature**

```ts
export declare const unsafeMakePatch: <Value, Patch>(
  initial: Value,
  options: {
    readonly differ: Differ.Differ<Value, Patch>
    readonly fork: Patch
    readonly join?: ((oldV: Value, newV: Value) => Value) | undefined
  }
) => FiberRef<Value>
```

Added in v1.0.0

## unsafeMakeSupervisor

**Signature**

```ts
export declare const unsafeMakeSupervisor: (initial: Supervisor.Supervisor<any>) => FiberRef<Supervisor.Supervisor<any>>
```

Added in v1.0.0

# fiberRefs

## currentContext

**Signature**

```ts
export declare const currentContext: FiberRef<Context.Context<never>>
```

Added in v1.0.0

## currentLogAnnotations

**Signature**

```ts
export declare const currentLogAnnotations: FiberRef<HashMap.HashMap<string, Logger.AnnotationValue>>
```

Added in v1.0.0

## currentLogLevel

**Signature**

```ts
export declare const currentLogLevel: FiberRef<LogLevel.LogLevel>
```

Added in v1.0.0

## currentLogSpan

**Signature**

```ts
export declare const currentLogSpan: FiberRef<List.List<LogSpan.LogSpan>>
```

Added in v1.0.0

## currentLoggers

**Signature**

```ts
export declare const currentLoggers: FiberRef<HashSet.HashSet<Logger.Logger<unknown, any>>>
```

Added in v1.0.0

## currentMaxOpsBeforeYield

**Signature**

```ts
export declare const currentMaxOpsBeforeYield: FiberRef<number>
```

Added in v1.0.0

## currentMetricLabels

**Signature**

```ts
export declare const currentMetricLabels: FiberRef<HashSet.HashSet<MetricLabel.MetricLabel>>
```

Added in v1.0.0

## currentMinimumLogLevel

**Signature**

```ts
export declare const currentMinimumLogLevel: FiberRef<LogLevel.LogLevel>
```

Added in v1.0.0

## currentRequestBatchingEnabled

**Signature**

```ts
export declare const currentRequestBatchingEnabled: FiberRef<boolean>
```

Added in v1.0.0

## currentRequestCache

**Signature**

```ts
export declare const currentRequestCache: FiberRef<Request.Cache>
```

Added in v1.0.0

## currentRequestCacheEnabled

**Signature**

```ts
export declare const currentRequestCacheEnabled: FiberRef<boolean>
```

Added in v1.0.0

## currentRuntimeFlags

**Signature**

```ts
export declare const currentRuntimeFlags: FiberRef<RuntimeFlags.RuntimeFlags>
```

Added in v1.0.0

## currentScheduler

**Signature**

```ts
export declare const currentScheduler: FiberRef<Scheduler.Scheduler>
```

Added in v1.0.0

## currentSchedulingPriority

**Signature**

```ts
export declare const currentSchedulingPriority: FiberRef<number>
```

Added in v1.0.0

## currentSupervisor

**Signature**

```ts
export declare const currentSupervisor: FiberRef<Supervisor.Supervisor<any>>
```

Added in v1.0.0

## currentTracerSpan

**Signature**

```ts
export declare const currentTracerSpan: FiberRef<List.List<Tracer.ParentSpan>>
```

Added in v1.0.0

## currentTracerSpanAnnotations

**Signature**

```ts
export declare const currentTracerSpanAnnotations: FiberRef<HashMap.HashMap<string, Tracer.AttributeValue>>
```

Added in v1.0.0

## currentTracerSpanLinks

**Signature**

```ts
export declare const currentTracerSpanLinks: FiberRef<Chunk.Chunk<Tracer.SpanLink>>
```

Added in v1.0.0

## currentTracerTimingEnabled

**Signature**

```ts
export declare const currentTracerTimingEnabled: FiberRef<boolean>
```

Added in v1.0.0

## interruptedCause

**Signature**

```ts
export declare const interruptedCause: FiberRef<Cause.Cause<never>>
```

Added in v1.0.0

## unhandledErrorLogLevel

**Signature**

```ts
export declare const unhandledErrorLogLevel: FiberRef<Option.Option<LogLevel.LogLevel>>
```

Added in v1.0.0

# getters

## get

**Signature**

```ts
export declare const get: <A>(self: FiberRef<A>) => Effect.Effect<never, never, A>
```

Added in v1.0.0

# model

## FiberRef (interface)

**Signature**

```ts
export interface FiberRef<A> extends Variance<A>, Pipeable {
  /** @internal */
  readonly initial: A
  /** @internal */
  readonly diff: (oldValue: A, newValue: A) => unknown
  /** @internal */
  readonly combine: (first: unknown, second: unknown) => unknown
  /** @internal */
  readonly patch: (patch: unknown) => (oldValue: A) => A
  /** @internal */
  readonly fork: unknown
  /** @internal */
  readonly join: (oldValue: A, newValue: A) => A
}
```

Added in v1.0.0

# models

## Variance (interface)

**Signature**

```ts
export interface Variance<A> {
  readonly [FiberRefTypeId]: {
    readonly _A: (_: never) => A
  }
}
```

Added in v1.0.0

# symbols

## FiberRefTypeId

**Signature**

```ts
export declare const FiberRefTypeId: typeof FiberRefTypeId
```

Added in v1.0.0

## FiberRefTypeId (type alias)

**Signature**

```ts
export type FiberRefTypeId = typeof FiberRefTypeId
```

Added in v1.0.0

# utils

## delete

**Signature**

```ts
export declare const delete: <A>(self: FiberRef<A>) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## getAndSet

**Signature**

```ts
export declare const getAndSet: {
  <A>(value: A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, value: A): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## getAndUpdate

**Signature**

```ts
export declare const getAndUpdate: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## getAndUpdateSome

**Signature**

```ts
export declare const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## getWith

**Signature**

```ts
export declare const getWith: {
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, B>): (self: FiberRef<A>) => Effect.Effect<R, E, B>
  <A, R, E, B>(self: FiberRef<A>, f: (a: A) => Effect.Effect<R, E, B>): Effect.Effect<R, E, B>
}
```

Added in v1.0.0

## modify

**Signature**

```ts
export declare const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: FiberRef<A>) => Effect.Effect<never, never, B>
  <A, B>(self: FiberRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
}
```

Added in v1.0.0

## modifySome

**Signature**

```ts
export declare const modifySome: <A, B>(
  self: FiberRef<A>,
  def: B,
  f: (a: A) => Option.Option<readonly [B, A]>
) => Effect.Effect<never, never, B>
```

Added in v1.0.0

## reset

**Signature**

```ts
export declare const reset: <A>(self: FiberRef<A>) => Effect.Effect<never, never, void>
```

Added in v1.0.0

## set

**Signature**

```ts
export declare const set: {
  <A>(value: A): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, value: A): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## update

**Signature**

```ts
export declare const update: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## updateAndGet

**Signature**

```ts
export declare const updateAndGet: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
}
```

Added in v1.0.0

## updateSome

**Signature**

```ts
export declare const updateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
}
```

Added in v1.0.0

## updateSomeAndGet

**Signature**

```ts
export declare const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
}
```

Added in v1.0.0
