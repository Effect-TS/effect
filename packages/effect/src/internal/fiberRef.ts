import * as Arr from "../Array.js"
import * as Chunk from "../Chunk.js"
import * as Context from "../Context.js"
import type * as Differ from "../Differ.js"
import type * as FiberRef from "../FiberRef.js"
import { identity } from "../Function.js"
import { globalValue } from "../GlobalValue.js"
import * as HashMap from "../HashMap.js"
import type * as HashSet from "../HashSet.js"
import * as List from "../List.js"
import type * as LogLevel from "../LogLevel.js"
import type * as LogSpan from "../LogSpan.js"
import type * as MetricLabel from "../MetricLabel.js"
import * as Option from "../Option.js"
import { pipeArguments } from "../Pipeable.js"
import type * as Tracer from "../Tracer.js"
import * as internalDiffer from "./differ.js"
import type * as fiberScope from "./fiberScope.js"
import * as logLevel from "./logLevel.js"

// -----------------------------------------------------------------------------
// FiberRef
// -----------------------------------------------------------------------------

/** @internal */
const FiberRefSymbolKey = "effect/FiberRef"

/** @internal */
export const TypeId: FiberRef.FiberRefTypeId = Symbol.for(
  FiberRefSymbolKey
) as FiberRef.FiberRefTypeId

const variance = {
  /* c8 ignore next */
  _A: (_: any) => _
}

/** @internal */
export const unsafeMake = <Value>(
  initial: Value,
  options?: {
    readonly fork?: ((a: Value) => Value) | undefined
    readonly join?: ((left: Value, right: Value) => Value) | undefined
  }
): FiberRef.FiberRef<Value> =>
  unsafeMakePatch(initial, {
    differ: internalDiffer.update(),
    fork: options?.fork ?? identity,
    join: options?.join
  })

/** @internal */
export const unsafeMakeHashSet = <A>(
  initial: HashSet.HashSet<A>
): FiberRef.FiberRef<HashSet.HashSet<A>> => {
  const differ = internalDiffer.hashSet<A>()
  return unsafeMakePatch(initial, {
    differ,
    fork: differ.empty
  })
}

/** @internal */
export const unsafeMakeReadonlyArray = <A>(
  initial: ReadonlyArray<A>
): FiberRef.FiberRef<ReadonlyArray<A>> => {
  const differ = internalDiffer.readonlyArray(internalDiffer.update<A>())
  return unsafeMakePatch(initial, {
    differ,
    fork: differ.empty
  })
}

/** @internal */
export const unsafeMakeContext = <A>(
  initial: Context.Context<A>
): FiberRef.FiberRef<Context.Context<A>> => {
  const differ = internalDiffer.environment<A>()
  return unsafeMakePatch(initial, {
    differ,
    fork: differ.empty
  })
}

/** @internal */
export const unsafeMakePatch = <Value, Patch>(
  initial: Value,
  options: {
    readonly differ: Differ.Differ<Value, Patch>
    readonly fork: Patch
    readonly join?: ((oldV: Value, newV: Value) => Value) | undefined
  }
): FiberRef.FiberRef<Value> => ({
  [TypeId]: variance,
  initial,
  diff: (oldValue, newValue) => options.differ.diff(oldValue, newValue),
  combine: (first, second) => options.differ.combine(first as Patch, second as Patch),
  patch: (patch) => (oldValue) => options.differ.patch(patch as Patch, oldValue),
  fork: options.fork,
  join: options.join ?? ((_, n) => n),
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/** @internal */
export const currentContext: FiberRef.FiberRef<Context.Context<never>> = globalValue(
  Symbol.for("effect/FiberRef/currentContext"),
  () => unsafeMakeContext(Context.empty())
)

/** @internal */
export const currentSchedulingPriority: FiberRef.FiberRef<number> = globalValue(
  Symbol.for("effect/FiberRef/currentSchedulingPriority"),
  () => unsafeMake(0)
)

/** @internal */
export const currentMaxOpsBeforeYield: FiberRef.FiberRef<number> = globalValue(
  Symbol.for("effect/FiberRef/currentMaxOpsBeforeYield"),
  () => unsafeMake(2048)
)

/** @internal */
export const currentLogAnnotations: FiberRef.FiberRef<HashMap.HashMap<string, unknown>> = globalValue(
  Symbol.for("effect/FiberRef/currentLogAnnotation"),
  () => unsafeMake(HashMap.empty())
)

/** @internal */
export const currentLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = globalValue(
  Symbol.for("effect/FiberRef/currentLogLevel"),
  () => unsafeMake<LogLevel.LogLevel>(logLevel.info)
)

/** @internal */
export const currentLogSpan: FiberRef.FiberRef<List.List<LogSpan.LogSpan>> = globalValue(
  Symbol.for("effect/FiberRef/currentLogSpan"),
  () => unsafeMake(List.empty<LogSpan.LogSpan>())
)

/** @internal */
export const currentConcurrency: FiberRef.FiberRef<"unbounded" | number> = globalValue(
  Symbol.for("effect/FiberRef/currentConcurrency"),
  () => unsafeMake<"unbounded" | number>("unbounded")
)

/**
 * @internal
 */
export const currentRequestBatching = globalValue(
  Symbol.for("effect/FiberRef/currentRequestBatching"),
  () => unsafeMake(true)
)

/** @internal */
export const currentUnhandledErrorLogLevel: FiberRef.FiberRef<Option.Option<LogLevel.LogLevel>> = globalValue(
  Symbol.for("effect/FiberRef/currentUnhandledErrorLogLevel"),
  () => unsafeMake(Option.some<LogLevel.LogLevel>(logLevel.debug))
)

/** @internal */
export const currentMetricLabels: FiberRef.FiberRef<ReadonlyArray<MetricLabel.MetricLabel>> = globalValue(
  Symbol.for("effect/FiberRef/currentMetricLabels"),
  () => unsafeMakeReadonlyArray(Arr.empty())
)

/** @internal */
export const currentForkScopeOverride: FiberRef.FiberRef<Option.Option<fiberScope.FiberScope>> = globalValue(
  Symbol.for("effect/FiberRef/currentForkScopeOverride"),
  () =>
    unsafeMake(Option.none(), {
      fork: () => Option.none() as Option.Option<fiberScope.FiberScope>,
      join: (parent, _) => parent
    })
)

/** @internal */
export const currentTracerEnabled: FiberRef.FiberRef<boolean> = globalValue(
  Symbol.for("effect/FiberRef/currentTracerEnabled"),
  () => unsafeMake(true)
)

/** @internal */
export const currentTracerTimingEnabled: FiberRef.FiberRef<boolean> = globalValue(
  Symbol.for("effect/FiberRef/currentTracerTiming"),
  () => unsafeMake(true)
)

/** @internal */
export const currentTracerSpanAnnotations: FiberRef.FiberRef<HashMap.HashMap<string, unknown>> = globalValue(
  Symbol.for("effect/FiberRef/currentTracerSpanAnnotations"),
  () => unsafeMake(HashMap.empty())
)

/** @internal */
export const currentTracerSpanLinks: FiberRef.FiberRef<Chunk.Chunk<Tracer.SpanLink>> = globalValue(
  Symbol.for("effect/FiberRef/currentTracerSpanLinks"),
  () => unsafeMake(Chunk.empty())
)

/** @internal */
export const currentMinimumLogLevel: FiberRef.FiberRef<LogLevel.LogLevel> = globalValue(
  "effect/FiberRef/currentMinimumLogLevel",
  () => unsafeMake<LogLevel.LogLevel>(logLevel.fromLiteral("Info"))
)
