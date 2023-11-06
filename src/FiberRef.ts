/**
 * @since 2.0.0
 */
import type { Cause } from "./Cause.js"
import type { Chunk } from "./Chunk.js"
import type { Context } from "./Context.js"
import type { Differ } from "./Differ.js"
import type { Effect } from "./Effect.js"
import type { LazyArg } from "./Function.js"
import type { HashMap } from "./HashMap.js"
import type { HashSet } from "./HashSet.js"
import * as core from "./internal/core.js"
import * as fiberRuntime from "./internal/fiberRuntime.js"
import * as query from "./internal/query.js"
import type { List } from "./List.js"
import type { Logger } from "./Logger.js"
import type { LogLevel } from "./LogLevel.js"
import type { LogSpan } from "./LogSpan.js"
import type { MetricLabel } from "./MetricLabel.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"
import type { Request } from "./Request.js"
import type { RuntimeFlags } from "./RuntimeFlags.js"
import { Scheduler } from "./Scheduler.js"
import type { Scope } from "./Scope.js"
import type { Supervisor } from "./Supervisor.js"
import type { Tracer } from "./Tracer.js"

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
) => Effect<Scope, never, FiberRef<A>> = fiberRuntime.fiberRefMake

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeWith: <Value>(ref: LazyArg<FiberRef<Value>>) => Effect<Scope, never, FiberRef<Value>> =
  fiberRuntime.fiberRefMakeWith

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeContext: <A>(
  initial: Context<A>
) => Effect<Scope, never, FiberRef<Context<A>>> = fiberRuntime.fiberRefMakeContext

/**
 * @since 2.0.0
 * @category constructors
 */
export const makeRuntimeFlags: (
  initial: RuntimeFlags
) => Effect<Scope, never, FiberRef<RuntimeFlags>> = fiberRuntime.fiberRefMakeRuntimeFlags

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
export const unsafeMakeHashSet: <A>(initial: HashSet<A>) => FiberRef<HashSet<A>> =
  core.fiberRefUnsafeMakeHashSet

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMakeContext: <A>(initial: Context<A>) => FiberRef<Context<A>> =
  core.fiberRefUnsafeMakeContext

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMakeSupervisor: (initial: Supervisor<any>) => FiberRef<Supervisor<any>> =
  fiberRuntime.fiberRefUnsafeMakeSupervisor

/**
 * @since 2.0.0
 * @category constructors
 */
export const unsafeMakePatch: <Value, Patch>(
  initial: Value,
  options: {
    readonly differ: Differ<Value, Patch>
    readonly fork: Patch
    readonly join?: (oldV: Value, newV: Value) => Value
  }
) => FiberRef<Value> = core.fiberRefUnsafeMakePatch

/**
 * @since 2.0.0
 * @category getters
 */
export const get: <A>(self: FiberRef<A>) => Effect<never, never, A> = core.fiberRefGet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndSet: {
  <A>(value: A): (self: FiberRef<A>) => Effect<never, never, A>
  <A>(self: FiberRef<A>, value: A): Effect<never, never, A>
} = core.fiberRefGetAndSet

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdate: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect<never, never, A>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect<never, never, A>
} = core.fiberRefGetAndUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const getAndUpdateSome: {
  <A>(pf: (a: A) => Option<A>): (self: FiberRef<A>) => Effect<never, never, A>
  <A>(self: FiberRef<A>, pf: (a: A) => Option<A>): Effect<never, never, A>
} = core.fiberRefGetAndUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const getWith: {
  <A, R, E, B>(f: (a: A) => Effect<R, E, B>): (self: FiberRef<A>) => Effect<R, E, B>
  <A, R, E, B>(self: FiberRef<A>, f: (a: A) => Effect<R, E, B>): Effect<R, E, B>
} = core.fiberRefGetWith

/**
 * @since 2.0.0
 * @category utils
 */
export const set: {
  <A>(value: A): (self: FiberRef<A>) => Effect<never, never, void>
  <A>(self: FiberRef<A>, value: A): Effect<never, never, void>
} = core.fiberRefSet

const _delete: <A>(self: FiberRef<A>) => Effect<never, never, void> = core.fiberRefDelete

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
export const reset: <A>(self: FiberRef<A>) => Effect<never, never, void> = core.fiberRefReset

/**
 * @since 2.0.0
 * @category utils
 */
export const modify: {
  <A, B>(f: (a: A) => readonly [B, A]): (self: FiberRef<A>) => Effect<never, never, B>
  <A, B>(self: FiberRef<A>, f: (a: A) => readonly [B, A]): Effect<never, never, B>
} = core.fiberRefModify

/**
 * @since 2.0.0
 * @category utils
 */
export const modifySome: <A, B>(
  self: FiberRef<A>,
  def: B,
  f: (a: A) => Option<readonly [B, A]>
) => Effect<never, never, B> = core.fiberRefModifySome

/**
 * @since 2.0.0
 * @category utils
 */
export const update: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect<never, never, void>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect<never, never, void>
} = core.fiberRefUpdate

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSome: {
  <A>(pf: (a: A) => Option<A>): (self: FiberRef<A>) => Effect<never, never, void>
  <A>(self: FiberRef<A>, pf: (a: A) => Option<A>): Effect<never, never, void>
} = core.fiberRefUpdateSome

/**
 * @since 2.0.0
 * @category utils
 */
export const updateAndGet: {
  <A>(f: (a: A) => A): (self: FiberRef<A>) => Effect<never, never, A>
  <A>(self: FiberRef<A>, f: (a: A) => A): Effect<never, never, A>
} = core.fiberRefUpdateAndGet

/**
 * @since 2.0.0
 * @category utils
 */
export const updateSomeAndGet: {
  <A>(pf: (a: A) => Option<A>): (self: FiberRef<A>) => Effect<never, never, A>
  <A>(self: FiberRef<A>, pf: (a: A) => Option<A>): Effect<never, never, A>
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
export const currentContext: FiberRef<Context<never>> = core.currentContext

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
export const unhandledErrorLogLevel: FiberRef<Option<LogLevel>> = core.currentUnhandledErrorLogLevel

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentLogAnnotations: FiberRef<HashMap<string, unknown>> = core.currentLogAnnotations

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentLoggers: FiberRef<HashSet<Logger<unknown, any>>> = fiberRuntime.currentLoggers

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentLogLevel: FiberRef<LogLevel> = core.currentLogLevel

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentMinimumLogLevel: FiberRef<LogLevel> = fiberRuntime.currentMinimumLogLevel

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentLogSpan: FiberRef<List<LogSpan>> = core.currentLogSpan

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentRuntimeFlags: FiberRef<RuntimeFlags> = fiberRuntime.currentRuntimeFlags

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentScheduler: FiberRef<Scheduler> = Scheduler.currentScheduler

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentSupervisor: FiberRef<Supervisor<any>> = fiberRuntime.currentSupervisor

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentMetricLabels: FiberRef<HashSet<MetricLabel>> = core.currentMetricLabels

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentTracerTimingEnabled: FiberRef<boolean> = core.currentTracerTimingEnabled

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentTracerSpanAnnotations: FiberRef<HashMap<string, unknown>> =
  core.currentTracerSpanAnnotations

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const currentTracerSpanLinks: FiberRef<Chunk<Tracer.SpanLink>> = core.currentTracerSpanLinks

/**
 * @since 2.0.0
 * @category fiberRefs
 */
export const interruptedCause: FiberRef<Cause<never>> = core.currentInterruptedCause
