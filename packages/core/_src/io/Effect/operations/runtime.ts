/**
 * Returns an effect that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into Effect code.
 *
 * @tsplus static ets/Effect/Ops runtime
 */
export function runtime<R>(__tsplusTrace?: string): Effect.RIO<R, Runtime<R>> {
  return Effect.environment<R>().flatMap(
    (env) => Effect.runtimeConfig.map((config) => new Runtime(env, config)),
    __tsplusTrace
  )
}

/**
 * @tsplus static ets/Effect/Ops defaultRuntimeConfig
 */
export const defaultRuntimeConfig: RuntimeConfig = RuntimeConfig({
  fatal: () => false,
  reportFatal: (defect) => {
    throw defect
  },
  supervisor: Supervisor.unsafeTrack(),
  loggers: HashSet(
    Logger.default
      .map((output) => console.log(output))
      .filterLogLevel((level) => level >= LogLevel.Info)
  ),
  flags: RuntimeConfigFlags.empty + RuntimeConfigFlag.EnableFiberRoots,
  maxOp: 2048
})

export const defaultRuntime = new Runtime<never>(
  Env.empty,
  defaultRuntimeConfig
)

/**
 * @tsplus fluent ets/Effect unsafeRunPromise
 * @tsplus static ets/Effect/Aspects unsafeRunPromise
 */
export const unsafeRunPromise = defaultRuntime.unsafeRunPromise

/**
 * @tsplus fluent ets/Effect unsafeRunAsync
 * @tsplus static ets/Effect/Aspects unsafeRunAsync
 */
export const unsafeRunAsync = defaultRuntime.unsafeRunAsync

/**
 * @tsplus fluent ets/Effect unsafeRunAsyncWith
 * @tsplus static ets/Effect/Aspects unsafeRunAsyncWith
 */
export const unsafeRunAsyncWith = defaultRuntime.unsafeRunAsyncWith

/**
 * @tsplus fluent ets/Effect unsafeRunPromiseExit
 * @tsplus static ets/Effect/Aspects unsafeRunPromiseExit
 */
export const unsafeRunPromiseExit = defaultRuntime.unsafeRunPromiseExit

/**
 * @tsplus fluent ets/Effect unsafeRunWith
 * @tsplus static ets/Effect/Aspects unsafeRunWith
 */
export const unsafeRunWith = defaultRuntime.unsafeRunWith
