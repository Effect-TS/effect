/**
 * @since 2.0.0
 */
import type * as Cause from "./Cause.js"
import type * as Chunk from "./Chunk.js"
import type * as Context from "./Context.js"
import type * as Differ from "./Differ.js"
import type * as Effect from "./Effect.js"
import type { LazyArg } from "./Function.js"
import type * as HashMap from "./HashMap.js"
import type * as HashSet from "./HashSet.js"
import * as core from "./internal/core.js"
import * as fiberRuntime from "./internal/fiberRuntime.js"
import * as query from "./internal/query.js"
import type * as List from "./List.js"
import type * as Logger from "./Logger.js"
import type * as LogLevel from "./LogLevel.js"
import type * as LogSpan from "./LogSpan.js"
import type * as MetricLabel from "./MetricLabel.js"
import type * as Option from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type * as Request from "./Request.js"
import type * as RuntimeFlags from "./RuntimeFlags.js"
import * as Scheduler from "./Scheduler.js"
import type * as Scope from "./Scope.js"
import type * as Supervisor from "./Supervisor.js"
import type * as Tracer from "./Tracer.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const FiberRefTypeId: unique symbol = core.FiberRefTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type FiberRefTypeId = typeof FiberRefTypeId

/**
 * @since 2.0.0
 * @category model
 */
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

/**
 * @since 2.0.0
 * @category models
 */
export interface Variance<A> {
  readonly [FiberRefTypeId]: {
    readonly _A: (_: never) => A
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <A>(
  initial: A,
  options?: {
    readonly fork?: (a: A) => A
    readonly join?: (left: A, right: A) => A
  }
) => Effect.Effect<Scope.Scope, never, FiberRef<A>> = fiberRuntime.fiberRefMake

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeWith: <Value>(ref: LazyArg<FiberRef<Value>>) => Effect.Effect<Scope.Scope, never, FiberRef<Value>> =
  fiberRuntime.fiberRefMakeWith

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeContext: <A>(
  initial: Context.Context<A>
) => Effect.Effect<Scope.Scope, never, FiberRef<Context.Context<A>>> = fiberRuntime.fiberRefMakeContext

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeRuntimeFlags: (
  initial: RuntimeFlags.RuntimeFlags
) => Effect.Effect<Scope.Scope, never, FiberRef<RuntimeFlags.RuntimeFlags>> = fiberRuntime.fiberRefMakeRuntimeFlags

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMake: <Value>(
  initial: Value,
  options?: {
    readonly fork?: (a: Value) => Value
    readonly join?: (left: Value, right: Value) => Value
  }
) => FiberRef<Value> = core.fiberRefUnsafeMake

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMakeHashSet: <A>(initial: HashSet.HashSet<A>) => FiberRef<HashSet.HashSet<A>> =
  core.fiberRefUnsafeMakeHashSet

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMakeContext: <A>(initial: Context.Context<A>) => FiberRef<Context.Context<A>> =
  core.fiberRefUnsafeMakeContext

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMakeSupervisor: (initial: Supervisor.Supervisor<any>) => FiberRef<Supervisor.Supervisor<any>> =
  fiberRuntime.fiberRefUnsafeMakeSupervisor

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMakePatch: <Value, Patch>(
  initial: Value,
  options: {
    readonly differ: Differ.Differ<Value, Patch>
    readonly fork: Patch
    readonly join?: (oldV: Value, newV: Value) => Value
  }
) => FiberRef<Value> = core.fiberRefUnsafeMakePatch

/**
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: FiberRef<A>) => Effect.Effect<never, never, A> = core.fiberRefGet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, value: A): Effect.Effect<never, never, A>
} = core.fiberRefGetAndSet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = core.fiberRefGetAndUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = core.fiberRefGetAndUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const getWith: {
  <A, R, E, B>(f: (a: A) => Effect.Effect<R, E, B>): (self: FiberRef<A>) => Effect.Effect<R, E, B>
  <A, R, E, B>(self: FiberRef<A>, f: (a: A) => Effect.Effect<R, E, B>): Effect.Effect<R, E, B>
} = core.fiberRefGetWith

/**
 * @since 2.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, value: A): Effect.Effect<never, never, void>
} = core.fiberRefSet

const _delete: <A>(self: FiberRef<A>) => Effect.Effect<never, never, void> = core.fiberRefDelete

export {
  /**
   * @since 2.0.0
   * @category utils
   */
  _delete as delete
}

/**
 * @since 2.0.0
 * @category utils
 */
export const reset: <A>(self: FiberRef<A>) => Effect.Effect<never, never, void> = core.fiberRefReset

/**
 * @since 2.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: FiberRef<A>) => Effect.Effect<never, never, B>
  <A, B>(self: FiberRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<never, never, B>
} = core.fiberRefModify

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySome: <A, B>(
  self: FiberRef<A>,
  def: B,
  f: (a: A) => Option.Option<readonly [B, A]>
) => Effect.Effect<never, never, B> = core.fiberRefModifySome

/**
 * @since 2.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, void>
} = core.fiberRefUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSome: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, void>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, void>
} = core.fiberRefUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect.Effect<never, never, A>
} = core.fiberRefUpdateAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option.Option<A>): (self: FiberRef<A>) => Effect.Effect<never, never, A>
  <A>(self: FiberRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<never, never, A>
} = core.fiberRefUpdateSomeAndGet

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentRequestBatchingEnabled: FiberRef<boolean> = core.currentRequestBatching

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentRequestCache: FiberRef<Request.Cache> = query.currentCache as any

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentRequestCacheEnabled: FiberRef<boolean> = query.currentCacheEnabled

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentContext: FiberRef<Context.Context<never>> = core.currentContext

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentSchedulingPriority: FiberRef<number> = core.currentSchedulingPriority

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentMaxOpsBeforeYield: FiberRef<number> = core.currentMaxOpsBeforeYield

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const unhandledErrorLogLevel: FiberRef<Option.Option<LogLevel.LogLevel>> = core.currentUnhandledErrorLogLevel

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentLogAnnotations: FiberRef<HashMap.HashMap<string, unknown>> = core.currentLogAnnotations

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentLoggers: FiberRef<HashSet.HashSet<Logger.Logger<unknown, any>>> = fiberRuntime.currentLoggers

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentLogLevel: FiberRef<LogLevel.LogLevel> = core.currentLogLevel

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentMinimumLogLevel: FiberRef<LogLevel.LogLevel> = fiberRuntime.currentMinimumLogLevel

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentLogSpan: FiberRef<List.List<LogSpan.LogSpan>> = core.currentLogSpan

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentRuntimeFlags: FiberRef<RuntimeFlags.RuntimeFlags> = fiberRuntime.currentRuntimeFlags

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentScheduler: FiberRef<Scheduler.Scheduler> = Scheduler.currentScheduler

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentSupervisor: FiberRef<Supervisor.Supervisor<any>> = fiberRuntime.currentSupervisor

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentMetricLabels: FiberRef<HashSet.HashSet<MetricLabel.MetricLabel>> = core.currentMetricLabels

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentTracerTimingEnabled: FiberRef<boolean> = core.currentTracerTimingEnabled

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentTracerSpanAnnotations: FiberRef<HashMap.HashMap<string, unknown>> =
  core.currentTracerSpanAnnotations

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentTracerSpanLinks: FiberRef<Chunk.Chunk<Tracer.SpanLink>> = core.currentTracerSpanLinks

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const interruptedCause: FiberRef<Cause.Cause<never>> = core.currentInterruptedCause
