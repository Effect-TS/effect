import type * as Effect from "../Effect.js"
import { identity, pipe } from "../Function.js"
import type * as Resource from "../Resource.js"
import type * as Schedule from "../Schedule.js"
import type * as Scope from "../Scope.js"
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

const resourceVariance = {
  /* c8 ignore next */
  _E: (_: any) => _,
  /* c8 ignore next */
  _A: (_: any) => _
}

/** @internal */
export const auto = <R, E, A, R2, Out>(
  acquire: Effect.Effect<R, E, A>,
  policy: Schedule.Schedule<R2, unknown, Out>
): Effect.Effect<R | R2 | Scope.Scope, never, Resource.Resource<E, A>> =>
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
  acquire: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, never, Resource.Resource<E, A>> =>
  core.flatMap(core.context<R>(), (env) =>
    pipe(
      scopedRef.fromAcquire(core.exit(acquire)),
      core.map((ref) => ({
        [ResourceTypeId]: resourceVariance,
        scopedRef: ref,
        acquire: core.provideContext(acquire, env)
      }))
    ))

/** @internal */
export const get = <E, A>(self: Resource.Resource<E, A>): Effect.Effect<never, E, A> =>
  core.flatMap(scopedRef.get(self.scopedRef), identity)

/** @internal */
export const refresh = <E, A>(self: Resource.Resource<E, A>): Effect.Effect<never, E, void> =>
  scopedRef.set(
    self.scopedRef,
    core.map(self.acquire, core.exitSucceed)
  )
