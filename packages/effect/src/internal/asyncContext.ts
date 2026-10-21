/** @internal */
export interface AsyncContext {
  runInAsyncScope<This, Arg, R>(fn: (this: This, arg: Arg) => R, thisArg: This, arg: Arg): R
}

/** @internal */
export const AsyncResource: (new(type: string) => AsyncContext) | undefined = (() => {
  try {
    return (globalThis as any).process?.getBuiltinModule?.("node:async_hooks")?.AsyncResource
  } catch {
    return undefined
  }
})()

/** @internal */
export const captureAsyncContext = (): AsyncContext | undefined =>
  AsyncResource === undefined ? undefined : new AsyncResource("effect/Fiber")
