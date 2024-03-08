import type * as Effect from "../Effect.js"
import type { Exit } from "../Exit.js"
import type * as Fiber from "../Fiber.js"
import type * as Layer from "../Layer.js"
import type { ManagedRuntime } from "../ManagedRuntime.js"
import { pipeArguments } from "../Pipeable.js"
import type * as Runtime from "../Runtime.js"
import * as Scope from "../Scope.js"
import * as effect from "./core-effect.js"
import * as core from "./core.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as internalLayer from "./layer.js"
import * as internalRuntime from "./runtime.js"

interface ManagedRuntimeImpl<R, E> extends ManagedRuntime<R, E> {
  readonly scope: Scope.CloseableScope
  cachedRuntime: Runtime.Runtime<R> | undefined
}

function provide<R, ER, A, E>(
  managed: ManagedRuntimeImpl<R, ER>,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E | ER> {
  return core.flatMap(
    managed.runtime,
    (rt) =>
      core.withFiberRuntime((fiber) => {
        fiber.setFiberRefs(rt.fiberRefs)
        fiber._runtimeFlags = rt.runtimeFlags
        return core.provideContext(effect, rt.context)
      })
  )
}

/** @internal */
export const make = <R, E>(
  layer: Layer.Layer<R, E, never>,
  memoMap?: Layer.MemoMap
): ManagedRuntime<R, E> => {
  memoMap = memoMap ?? internalLayer.unsafeMakeMemoMap()
  const scope = internalRuntime.unsafeRunSyncEffect(fiberRuntime.scopeMake())
  const self: ManagedRuntimeImpl<R, E> = {
    memoMap,
    scope,
    runtime: internalRuntime
      .unsafeRunSyncEffect(
        effect.memoize(
          core.tap(
            Scope.extend(
              internalLayer.toRuntimeWithMemoMap(layer, memoMap),
              scope
            ),
            (rt) => {
              self.cachedRuntime = rt
            }
          )
        )
      ),
    cachedRuntime: undefined,
    pipe() {
      return pipeArguments(this, arguments)
    }
  }
  return self
}

/** @internal */
export const dispose = <R, E>(self: ManagedRuntime<R, E>): Promise<void> =>
  internalRuntime.unsafeRunPromiseEffect(disposeEffect(self))

/** @internal */
export const disposeEffect = <R, E>(self: ManagedRuntime<R, E>): Effect.Effect<void> =>
  core.suspend(() => {
    const impl = self as ManagedRuntimeImpl<R, E>
    ;(self as any).runtime = core.die("ManagedRuntime disposed")
    impl.cachedRuntime = undefined
    return Scope.close(impl.scope, core.exitUnit)
  })

/** @internal */
export const runFork =
  <R, ER>(self: ManagedRuntime<R, ER>) =>
  <A, E>(effect: Effect.Effect<A, E, R>, options?: Runtime.RunForkOptions): Fiber.RuntimeFiber<A, E | ER> => {
    const impl = self as ManagedRuntimeImpl<R, ER>
    return impl.cachedRuntime === undefined ?
      internalRuntime.unsafeForkEffect(provide(impl, effect), options) :
      internalRuntime.unsafeFork(impl.cachedRuntime)(effect, options)
  }

/** @internal */
export const runSyncExit =
  <R, ER>(self: ManagedRuntime<R, ER>) => <A, E>(effect: Effect.Effect<A, E, R>): Exit<A, E | ER> => {
    const impl = self as ManagedRuntimeImpl<R, ER>
    return impl.cachedRuntime === undefined ?
      internalRuntime.unsafeRunSyncExitEffect(provide(impl, effect)) :
      internalRuntime.unsafeRunSyncExit(impl.cachedRuntime)(effect)
  }

/** @internal */
export const runSync = <R, ER>(self: ManagedRuntime<R, ER>) => <A, E>(effect: Effect.Effect<A, E, R>): A => {
  const impl = self as ManagedRuntimeImpl<R, ER>
  return impl.cachedRuntime === undefined ?
    internalRuntime.unsafeRunSyncEffect(provide(impl, effect)) :
    internalRuntime.unsafeRunSync(impl.cachedRuntime)(effect)
}

/** @internal */
export const runPromiseExit =
  <R, ER>(self: ManagedRuntime<R, ER>) => <A, E>(effect: Effect.Effect<A, E, R>): Promise<Exit<A, E | ER>> => {
    const impl = self as ManagedRuntimeImpl<R, ER>
    return impl.cachedRuntime === undefined ?
      internalRuntime.unsafeRunPromiseExitEffect(provide(impl, effect)) :
      internalRuntime.unsafeRunPromiseExit(impl.cachedRuntime)(effect)
  }

/** @internal */
export const runCallback = <R, ER>(
  runtime: ManagedRuntime<R, ER>
) =>
<A, E>(
  effect: Effect.Effect<A, E, R>,
  options?: Runtime.RunCallbackOptions<A, E | ER> | undefined
): Runtime.Cancel<A, E | ER> => {
  const impl = runtime as ManagedRuntimeImpl<R, ER>
  return impl.cachedRuntime === undefined ?
    internalRuntime.unsafeRunCallback(internalRuntime.defaultRuntime)(provide(impl, effect), options) :
    internalRuntime.unsafeRunCallback(impl.cachedRuntime)(effect, options)
}

/** @internal */
export const runPromise =
  <R, ER>(self: ManagedRuntime<R, ER>) => <A, E>(effect: Effect.Effect<A, E, R>): Promise<A> => {
    const impl = self as ManagedRuntimeImpl<R, ER>
    return impl.cachedRuntime === undefined ?
      internalRuntime.unsafeRunPromiseEffect(provide(impl, effect)) :
      internalRuntime.unsafeRunPromise(impl.cachedRuntime)(effect)
  }
