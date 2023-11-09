import type { Effect } from "../exports/Effect.js"
import { identity, pipe } from "../exports/Function.js"
import type { Resource } from "../exports/Resource.js"
import type { Schedule } from "../exports/Schedule.js"
import type { Scope } from "../exports/Scope.js"
import * as core from "./core.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as _schedule from "./schedule.js"
import * as scopedRef from "./scopedRef.js"

/** @internal */
const ResourceSymbolKey = "effect/Resource"

/** @internal */
export const ResourceTypeId: Resource.ResourceTypeId = Symbol.for(
  ResourceSymbolKey
) as Resource.ResourceTypeId

/** @internal */
const cachedVariance = {
  _E: (_: never) => _,
  _A: (_: never) => _
}

/** @internal */
export const auto = <R, E, A, R2, Out>(
  acquire: Effect<R, E, A>,
  policy: Schedule<R2, unknown, Out>
): Effect<R | R2 | Scope, never, Resource<E, A>> =>
  core.tap(manual(acquire), (manual) =>
    fiberRuntime.acquireRelease(
      pipe(
        refresh(manual),
        _schedule.schedule_Effect(policy),
        core.interruptible,
        fiberRuntime.forkDaemon
      ),
      core.interruptFiber
    ))

/** @internal */
export const manual = <R, E, A>(
  acquire: Effect<R, E, A>
): Effect<R | Scope, never, Resource<E, A>> =>
  core.flatMap(core.context<R>(), (env) =>
    pipe(
      scopedRef.fromAcquire(core.exit(acquire)),
      core.map((ref) => ({
        [ResourceTypeId]: cachedVariance,
        scopedRef: ref,
        acquire: () => core.provideContext(acquire, env)
      }))
    ))

/** @internal */
export const get = <E, A>(self: Resource<E, A>): Effect<never, E, A> =>
  core.flatMap(scopedRef.get(self.scopedRef), identity)

/** @internal */
export const refresh = <E, A>(self: Resource<E, A>): Effect<never, E, void> =>
  scopedRef.set(
    self.scopedRef,
    core.map(self.acquire(), core.exitSucceed)
  )
