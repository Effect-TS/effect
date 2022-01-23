import { constTrue, constVoid, pipe } from "../../../data/Function"
import { unsafeTrack } from "../../../io/Supervisor"
import { HasClock, LiveClock } from "../../Clock"
import type { Exit } from "../../Exit/definition"
import type { FiberId } from "../../FiberId/definition"
import * as LoggerSet from "../../Logger/Set"
import { defaultRandom, HasRandom } from "../../Random"
import { Runtime } from "../../Runtime"
import { RuntimeConfig } from "../../RuntimeConfig"
import * as RuntimeConfigFlag from "../../RuntimeConfig/Flag"
import * as RuntimeConfigFlags from "../../RuntimeConfig/Flags"
import type { Effect, RIO } from "../definition"
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
export function runtime<R>(__trace?: string): RIO<R, Runtime<R>> {
  return chain_(
    environment<R>(),
    (env) => map_(runtimeConfig, (config) => new Runtime(env, config)),
    __trace
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

/**
 * @ets fluent ets/Effect unsafeRunPromise
 */
export function unsafeRunPromiseMethod<E, A>(
  self: Effect<DefaultEnv, E, A>,
  __trace?: string | undefined
): Promise<A> {
  return unsafeRunPromise(self, __trace)
}

/**
 * @ets fluent ets/Effect unsafeRunPromiseExit
 */
export function unsafeRunPromiseExitMethod<E, A>(
  self: Effect<DefaultEnv, E, A>,
  __trace?: string | undefined
): Promise<Exit<E, A>> {
  return unsafeRunPromiseExit(self, __trace)
}

/**
 * @ets fluent ets/Effect unsafeRunWith
 */
export function unsafeRunWithMethod<E, A>(
  self: Effect<DefaultEnv, E, A>,
  k: (exit: Exit<E, A>) => void,
  __trace?: string | undefined
): (fiberId: FiberId) => (_: (exit: Exit<E, A>) => void) => void {
  return unsafeRunWith(self, k, __trace)
}

/**
 * @ets fluent ets/Effect unsafeRunAsync
 */
export function unsafeRunAsynchMethod<E, A>(
  self: Effect<DefaultEnv, E, A>,
  __trace?: string | undefined
): void {
  return unsafeRunAsync(self, __trace)
}

/**
 * @ets fluent ets/Effect unsafeRunAsynchWith
 */
export function unsafeRunAsynchWithMethod<E, A>(
  self: Effect<DefaultEnv, E, A>,
  k: (exit: Exit<E, A>) => void,
  __trace?: string | undefined
): void {
  return unsafeRunAsyncWith(self, k, __trace)
}

/**
 * @ets fluent ets/Effect unsafeRunAsyncCancelable
 */
export function unsafeRunAsyncCancelableMethod<E, A>(
  effect: Effect<DefaultEnv, E, A>,
  k: (exit: Exit<E, A>) => void,
  __trace?: string | undefined
): (fiberId: FiberId) => Exit<E, A> {
  return unsafeRunAsyncCancelable(effect, k, __trace)
}
