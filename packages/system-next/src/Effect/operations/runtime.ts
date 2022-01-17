import { HasClock, LiveClock } from "../../Clock"
import { constTrue, constVoid, pipe } from "../../Function"
import * as LoggerSet from "../../Logger/Set"
import { defaultRandom, HasRandom } from "../../Random"
import { Runtime } from "../../Runtime"
import { RuntimeConfig } from "../../RuntimeConfig"
import * as RuntimeConfigFlag from "../../RuntimeConfig/Flag"
import * as RuntimeConfigFlags from "../../RuntimeConfig/Flags"
import { unsafeTrack } from "../../Supervisor"
import type { RIO } from "../definition"
import { chain_ } from "./chain"
import { environment } from "./environment"
import { map_ } from "./map"
import { runtimeConfig } from "./runtimeConfig"

/**
 * Returns an effect that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into ZIO code.
 */
export function runtime<R>(__trace?: string): RIO<R, Runtime<R>> {
  return chain_(
    environment<R>(),
    (env) => map_(runtimeConfig, (config) => new Runtime(env, config)),
    __trace
  )
}

export type DefaultEnv = HasClock & HasRandom

export const defaultEnv: DefaultEnv = {
  [HasClock.key]: new LiveClock(),
  [HasRandom.key]: defaultRandom
} as any

export const defaultRuntimeConfig: RuntimeConfig = new RuntimeConfig({
  fatal: constTrue,
  reportFatal: constVoid,
  supervisor: unsafeTrack(),
  loggers: pipe(
    LoggerSet.defaultSet.value,
    LoggerSet.map((b) => console.log(b)),
    LoggerSet.filterLogLevel((logLevel) => logLevel._tag === "Info")
  ),
  flags: RuntimeConfigFlags.add_(
    RuntimeConfigFlags.empty,
    RuntimeConfigFlag.enableFiberRoots
  ),
  maxOp: 2048
})

export const {
  unsafeRunAsync,
  unsafeRunAsyncCancelable,
  unsafeRunAsyncWith,
  unsafeRunPromise,
  unsafeRunPromiseExit,
  unsafeRunWith
} = new Runtime(defaultEnv, defaultRuntimeConfig)
