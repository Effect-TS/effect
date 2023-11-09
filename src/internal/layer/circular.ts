import type { ConfigProvider } from "../../exports/ConfigProvider.js"
import { Context } from "../../exports/Context.js"
import type { Effect } from "../../exports/Effect.js"
import type { Exit } from "../../exports/Exit.js"
import { dual } from "../../exports/Function.js"
import { HashSet } from "../../exports/HashSet.js"
import type { Layer } from "../../exports/Layer.js"
import type { Logger } from "../../exports/Logger.js"
import type { LogLevel } from "../../exports/LogLevel.js"
import type { Scope } from "../../exports/Scope.js"
import type { Supervisor } from "../../exports/Supervisor.js"
import type { Tracer } from "../../exports/Tracer.js"
import * as core from "../core.js"
import * as fiberRuntime from "../fiberRuntime.js"
import * as layer from "../layer.js"
import * as runtimeFlags from "../runtimeFlags.js"
import * as runtimeFlagsPatch from "../runtimeFlagsPatch.js"
import * as _supervisor from "../supervisor.js"
import * as tracer from "../tracer.js"

// circular with Logger

/** @internal */
export const minimumLogLevel = (level: LogLevel): Layer<never, never, never> =>
  layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScoped(
      fiberRuntime.currentMinimumLogLevel,
      level
    )
  )

/** @internal */
export const withMinimumLogLevel = dual<
  (level: LogLevel) => <R, E, A>(self: Effect<R, E, A>) => Effect<R, E, A>,
  <R, E, A>(self: Effect<R, E, A>, level: LogLevel) => Effect<R, E, A>
>(2, (self, level) =>
  core.fiberRefLocally(
    fiberRuntime.currentMinimumLogLevel,
    level
  )(self))

/** @internal */
export const addLogger = <A>(logger: Logger<unknown, A>): Layer<never, never, never> =>
  layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScopedWith(
      fiberRuntime.currentLoggers,
      HashSet.add(logger)
    )
  )

/** @internal */
export const addLoggerEffect = <R, E, A>(
  effect: Effect<R, E, Logger<unknown, A>>
): Layer<R, E, never> =>
  layer.unwrapEffect(
    core.map(effect, addLogger)
  )

/** @internal */
export const addLoggerScoped = <R, E, A>(
  effect: Effect<R, E, Logger<unknown, A>>
): Layer<Exclude<R, Scope>, E, never> =>
  layer.unwrapScoped(
    core.map(effect, addLogger)
  )

/** @internal */
export const removeLogger = <A>(logger: Logger<unknown, A>): Layer<never, never, never> =>
  layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScopedWith(
      fiberRuntime.currentLoggers,
      HashSet.remove(logger)
    )
  )

/** @internal */
export const replaceLogger = dual<
  <B>(that: Logger<unknown, B>) => <A>(self: Logger<unknown, A>) => Layer<never, never, never>,
  <A, B>(self: Logger<unknown, A>, that: Logger<unknown, B>) => Layer<never, never, never>
>(2, (self, that) => layer.flatMap(removeLogger(self), () => addLogger(that)))

/** @internal */
export const replaceLoggerEffect = dual<
  <R, E, B>(
    that: Effect<R, E, Logger<unknown, B>>
  ) => <A>(self: Logger<unknown, A>) => Layer<R, E, never>,
  <A, R, E, B>(
    self: Logger<unknown, A>,
    that: Effect<R, E, Logger<unknown, B>>
  ) => Layer<R, E, never>
>(2, (self, that) => layer.flatMap(removeLogger(self), () => addLoggerEffect(that)))

/** @internal */
export const replaceLoggerScoped = dual<
  <R, E, B>(
    that: Effect<R, E, Logger<unknown, B>>
  ) => <A>(self: Logger<unknown, A>) => Layer<Exclude<R, Scope>, E, never>,
  <A, R, E, B>(
    self: Logger<unknown, A>,
    that: Effect<R, E, Logger<unknown, B>>
  ) => Layer<Exclude<R, Scope>, E, never>
>(2, (self, that) => layer.flatMap(removeLogger(self), () => addLoggerScoped(that)))

/** @internal */
export const addSupervisor = <A>(supervisor: Supervisor<A>): Layer<never, never, never> =>
  layer.scopedDiscard(
    fiberRuntime.fiberRefLocallyScopedWith(
      fiberRuntime.currentSupervisor,
      (current) => new _supervisor.Zip(current, supervisor)
    )
  )

/** @internal */
export const enableCooperativeYielding: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.enable(runtimeFlags.CooperativeYielding)
  )
)

/** @internal */
export const enableInterruption: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.enable(runtimeFlags.Interruption)
  )
)

/** @internal */
export const enableOpSupervision: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.enable(runtimeFlags.OpSupervision)
  )
)

/** @internal */
export const enableRuntimeMetrics: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.enable(runtimeFlags.RuntimeMetrics)
  )
)

/** @internal */
export const enableWindDown: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.enable(runtimeFlags.WindDown)
  )
)

/** @internal */
export const disableCooperativeYielding: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.disable(runtimeFlags.CooperativeYielding)
  )
)

/** @internal */
export const disableInterruption: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.disable(runtimeFlags.Interruption)
  )
)

/** @internal */
export const disableOpSupervision: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.disable(runtimeFlags.OpSupervision)
  )
)

/** @internal */
export const disableRuntimeMetrics: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.disable(runtimeFlags.RuntimeMetrics)
  )
)

/** @internal */
export const disableWindDown: Layer<never, never, never> = layer.scopedDiscard(
  fiberRuntime.withRuntimeFlagsScoped(
    runtimeFlagsPatch.disable(runtimeFlags.WindDown)
  )
)

/** @internal */
export const setConfigProvider = (configProvider: ConfigProvider): Layer<never, never, never> =>
  layer.scopedDiscard(fiberRuntime.withConfigProviderScoped(configProvider))

/** @internal */
export const parentSpan = (span: Tracer.ParentSpan): Layer<never, never, Tracer.ParentSpan> =>
  layer.succeedContext(Context.make(tracer.spanTag, span))

/** @internal */
export const span = (
  name: string,
  options?: {
    readonly attributes?: Record<string, unknown>
    readonly links?: ReadonlyArray<Tracer.SpanLink>
    readonly parent?: Tracer.ParentSpan
    readonly root?: boolean
    readonly context?: Context<never>
    readonly onEnd?: (span: Tracer.Span, exit: Exit<unknown, unknown>) => Effect<never, never, void>
  }
): Layer<never, never, Tracer.ParentSpan> =>
  layer.scoped(
    tracer.spanTag,
    options?.onEnd
      ? core.tap(
        fiberRuntime.makeSpanScoped(name, options),
        (span) => fiberRuntime.addFinalizer((exit) => options.onEnd!(span, exit))
      )
      : fiberRuntime.makeSpanScoped(name, options)
  )

/** @internal */
export const setTracer = (tracer: Tracer): Layer<never, never, never> =>
  layer.scopedDiscard(fiberRuntime.withTracerScoped(tracer))
