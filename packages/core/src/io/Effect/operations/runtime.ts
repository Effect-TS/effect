import { constFalse } from "../../../data/Function"
import { unsafeTrack } from "../../../io/Supervisor"
import { HasClock, LiveClock } from "../../Clock"
import { Logger } from "../../Logger"
import { LogLevel } from "../../LogLevel"
import { defaultRandom, HasRandom } from "../../Random"
import { Runtime } from "../../Runtime"
import { RuntimeConfig } from "../../RuntimeConfig"
import * as RuntimeConfigFlag from "../../RuntimeConfig/Flag"
import * as RuntimeConfigFlags from "../../RuntimeConfig/Flags"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into ZIO code.
 *
 * @tsplus static ets/EffectOps runtime
 */
export function runtime<R>(__tsplusTrace?: string): RIO<R, Runtime<R>> {
  return Effect.environment<R>().flatMap(
    (env) => Effect.runtimeConfig.map((config) => new Runtime(env, config)),
    __tsplusTrace
  )
}

export type DefaultEnv = HasClock & HasRandom

/**
 * @tsplus static ets/EffectOps defaultEnv
 */
export const defaultEnv: DefaultEnv = {
  [HasClock.key]: new LiveClock(),
  [HasRandom.key]: defaultRandom
} as any

/**
 * @tsplus static ets/EffectOps defaultRuntimeConfig
 */
export const defaultRuntimeConfig: RuntimeConfig = RuntimeConfig({
  fatal: constFalse,
  reportFatal: (defect) => {
    throw defect
  },
  supervisor: unsafeTrack(),
  logger: Logger.default
    .map((output) => console.log(output))
    .filterLogLevel((level) => level >= LogLevel.Info),
  flags: RuntimeConfigFlags.add_(
    RuntimeConfigFlags.empty,
    RuntimeConfigFlag.enableFiberRoots
  ),
  maxOp: 2048
})

export const defaultRuntime = new Runtime(defaultEnv, defaultRuntimeConfig)

/**
 * @tsplus fluent ets/Effect unsafeRunPromise
 */
export const unsafeRunPromise = defaultRuntime.unsafeRunPromise

/**
 * @tsplus fluent ets/Effect unsafeRunAsync
 */
export const unsafeRunAsync = defaultRuntime.unsafeRunAsync

/**
 * @tsplus fluent ets/Effect unsafeRunAsyncCancelable
 */
export const unsafeRunAsyncCancelable = defaultRuntime.unsafeRunAsyncCancelable

/**
 * @tsplus fluent ets/Effect unsafeRunAsyncWith
 */
export const unsafeRunAsyncWith = defaultRuntime.unsafeRunAsyncWith

/**
 * @tsplus fluent ets/Effect unsafeRunPromiseExit
 */
export const unsafeRunPromiseExit = defaultRuntime.unsafeRunPromiseExit

/**
 * @tsplus fluent ets/Effect unsafeRunWith
 */
export const unsafeRunWith = defaultRuntime.unsafeRunWith
