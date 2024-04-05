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
    managed.runtimeEffect,
    (rt) =>
      core.withFiberRuntime((fiber) => {
        fiber.setFiberRefs(rt.fiberRefs)
        fiber._runtimeFlags = rt.runtimeFlags
        return core.provideContext(effect, rt.context)
      })
  )
}

/** @internal */
export const make = <R, ER>(
  layer: Layer.Layer<R, ER, never>,
  memoMap?: Layer.MemoMap
): ManagedRuntime<R, ER> => {
  memoMap = memoMap ?? internalLayer.unsafeMakeMemoMap()
  const scope = internalRuntime.unsafeRunSyncEffect(fiberRuntime.scopeMake())
  const self: ManagedRuntimeImpl<R, ER> = {
    memoMap,
    scope,
    runtimeEffect: internalRuntime
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
    },
    runtime() {
      return self.cachedRuntime === undefined ?
        internalRuntime.unsafeRunPromiseEffect(self.runtimeEffect) :
        Promise.resolve(self.cachedRuntime)
    },
    dispose(): Promise<void> {
      return internalRuntime.unsafeRunPromiseEffect(self.disposeEffect)
    },
    disposeEffect: core.suspend(() => {
      ;(self as any).runtime = core.die("ManagedRuntime disposed")
      self.cachedRuntime = undefined
      return Scope.close(self.scope, core.exitVoid)
    }),
    runFork<A, E>(effect: Effect.Effect<A, E, R>, options?: Runtime.RunForkOptions): Fiber.RuntimeFiber<A, E | ER> {
      return self.cachedRuntime === undefined ?
        internalRuntime.unsafeForkEffect(provide(self, effect), options) :
        internalRuntime.unsafeFork(self.cachedRuntime)(effect, options)
    },
    runSyncExit<A, E>(effect: Effect.Effect<A, E, R>): Exit<A, E | ER> {
      return self.cachedRuntime === undefined ?
        internalRuntime.unsafeRunSyncExitEffect(provide(self, effect)) :
        internalRuntime.unsafeRunSyncExit(self.cachedRuntime)(effect)
    },
    runSync<A, E>(effect: Effect.Effect<A, E, R>): A {
      return self.cachedRuntime === undefined ?
        internalRuntime.unsafeRunSyncEffect(provide(self, effect)) :
        internalRuntime.unsafeRunSync(self.cachedRuntime)(effect)
    },
    runPromiseExit<A, E>(effect: Effect.Effect<A, E, R>, options?: {
      readonly signal?: AbortSignal | undefined
    }): Promise<Exit<A, E | ER>> {
      return self.cachedRuntime === undefined ?
        internalRuntime.unsafeRunPromiseExitEffect(provide(self, effect), options) :
        internalRuntime.unsafeRunPromiseExit(self.cachedRuntime)(effect, options)
    },
    runCallback<A, E>(
      effect: Effect.Effect<A, E, R>,
      options?: Runtime.RunCallbackOptions<A, E | ER> | undefined
    ): Runtime.Cancel<A, E | ER> {
      return self.cachedRuntime === undefined ?
        internalRuntime.unsafeRunCallback(internalRuntime.defaultRuntime)(provide(self, effect), options) :
        internalRuntime.unsafeRunCallback(self.cachedRuntime)(effect, options)
    },
    runPromise<A, E>(effect: Effect.Effect<A, E, R>, options?: {
      readonly signal?: AbortSignal | undefined
    }): Promise<A> {
      return self.cachedRuntime === undefined ?
        internalRuntime.unsafeRunPromiseEffect(provide(self, effect), options) :
        internalRuntime.unsafeRunPromise(self.cachedRuntime)(effect, options)
    }
  }
  return self
}
