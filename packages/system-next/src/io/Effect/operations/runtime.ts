import { constTrue, constVoid, pipe } from "../../../data/Function"
import { unsafeTrack } from "../../../io/Supervisor"
import { HasClock, LiveClock } from "../../Clock"
import * as LoggerSet from "../../Logger/Set"
import * as LogLevel from "../../LogLevel"
import { defaultRandom, HasRandom } from "../../Random"
import { Runtime } from "../../Runtime"
import { RuntimeConfig } from "../../RuntimeConfig"
import * as RuntimeConfigFlag from "../../RuntimeConfig/Flag"
import * as RuntimeConfigFlags from "../../RuntimeConfig/Flags"
import type { RIO } from "../definition"
import { chain_ } from "./chain"
import { environment } from "./environment"
import { map_ } from "./map"
import { runtimeConfig } from "./runtimeConfig"

/**
 * Returns an effect that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into ZIO code.
 *
 * @ets static ets/EffectOps runtime
 */
export function runtime<R>(__etsTrace?: string): RIO<R, Runtime<R>> {
  return chain_(
    environment<R>(),
    (env) => map_(runtimeConfig, (config) => new Runtime(env, config)),
    __etsTrace
  )
}

export type DefaultEnv = HasClock & HasRandom

/**
 * @ets static ets/EffectOps defaultEnv
 */
export const defaultEnv: DefaultEnv = {
  [HasClock.key]: new LiveClock(),
  [HasRandom.key]: defaultRandom
} as any

/**
 * @ets static ets/EffectOps defaultRuntimeConfig
 */
export const defaultRuntimeConfig: RuntimeConfig = new RuntimeConfig({
  fatal: constTrue,
  reportFatal: constVoid,
  supervisor: unsafeTrack(),
  loggers: pipe(
    LoggerSet.defaultSet.value,
    LoggerSet.map((b) => console.log(b)),
    LoggerSet.filterLogLevel((level) => LogLevel.geq_(level, LogLevel.Info))
  ),
  flags: RuntimeConfigFlags.add_(
    RuntimeConfigFlags.empty,
    RuntimeConfigFlag.enableFiberRoots
  ),
  maxOp: 2048
})

export const defaultRuntime = new Runtime(defaultEnv, defaultRuntimeConfig)

/**
 * @ets fluent ets/Effect unsafeRunPromise
 */
export const unsafeRunPromise = defaultRuntime.unsafeRunPromise
/**
 * @ets fluent ets/Effect unsafeRunAsync
 */
export const unsafeRunAsync = defaultRuntime.unsafeRunAsync
/**
 * @ets fluent ets/Effect unsafeRunAsyncCancelable
 */
export const unsafeRunAsyncCancelable = defaultRuntime.unsafeRunAsyncCancelable
/**
 * @ets fluent ets/Effect unsafeRunAsyncWith
 */
export const unsafeRunAsyncWith = defaultRuntime.unsafeRunAsyncWith
/**
 * @ets fluent ets/Effect unsafeRunPromiseExit
 */
export const unsafeRunPromiseExit = defaultRuntime.unsafeRunPromiseExit
/**
 * @ets fluent ets/Effect unsafeRunWith
 */
export const unsafeRunWith = defaultRuntime.unsafeRunWith
