import { Context } from "../exports/Context.js"
import type { Effect } from "../exports/Effect.js"
import type { LazyArg } from "../exports/Function.js"
import { dual, pipe } from "../exports/Function.js"
import { pipeArguments } from "../exports/Pipeable.js"
import type { Scope } from "../exports/Scope.js"
import type { ScopedRef } from "../exports/ScopedRef.js"
import * as effect from "./core-effect.js"
import * as core from "./core.js"
import * as circular from "./effect/circular.js"
import * as fiberRuntime from "./fiberRuntime.js"
import * as ref from "./ref.js"
import * as synchronized from "./synchronizedRef.js"

/** @internal */
const ScopedRefSymbolKey = "effect/ScopedRef"

/** @internal */
export const ScopedRefTypeId: ScopedRef.ScopedRefTypeId = Symbol.for(
  ScopedRefSymbolKey
) as ScopedRef.ScopedRefTypeId

/** @internal */
const scopedRefVariance = {
  _A: (_: never) => _
}

/** @internal  */
const close = <A>(self: ScopedRef<A>): Effect<never, never, void> =>
  core.flatMap(ref.get(self.ref), (tuple) => tuple[0].close(core.exitUnit))

/** @internal */
export const fromAcquire = <R, E, A>(
  acquire: Effect<R, E, A>
): Effect<R | Scope, E, ScopedRef<A>> =>
  core.uninterruptibleMask((restore) =>
    pipe(
      fiberRuntime.scopeMake(),
      core.flatMap((newScope) =>
        pipe(
          restore(
            pipe(
              acquire,
              core.mapInputContext<R, Scope | R>(Context.add(fiberRuntime.scopeTag, newScope))
            )
          ),
          core.onError((cause) => newScope.close(core.exitFail(cause))),
          core.flatMap((value) =>
            pipe(
              circular.makeSynchronized([newScope, value] as const),
              core.flatMap((ref) => {
                const scopedRef: ScopedRef<A> = {
                  [ScopedRefTypeId]: scopedRefVariance,
                  pipe() {
                    return pipeArguments(this, arguments)
                  },
                  ref
                }
                return pipe(
                  fiberRuntime.addFinalizer<R | Scope, void>(() => close(scopedRef)),
                  core.as(scopedRef)
                )
              })
            )
          )
        )
      )
    )
  )

/** @internal */
export const get = <A>(self: ScopedRef<A>): Effect<never, never, A> => core.map(ref.get(self.ref), (tuple) => tuple[1])

/** @internal */
export const make = <A>(evaluate: LazyArg<A>): Effect<Scope, never, ScopedRef<A>> => fromAcquire(core.sync(evaluate))

/** @internal */
export const set = dual<
  <A, R, E>(
    acquire: Effect<R, E, A>
  ) => (self: ScopedRef<A>) => Effect<Exclude<R, Scope>, E, void>,
  <A, R, E>(
    self: ScopedRef<A>,
    acquire: Effect<R, E, A>
  ) => Effect<Exclude<R, Scope>, E, void>
>(2, <A, R, E>(
  self: ScopedRef<A>,
  acquire: Effect<R, E, A>
) =>
  core.flatten(
    synchronized.modifyEffect(self.ref, ([oldScope, value]) =>
      core.uninterruptibleMask((restore) =>
        pipe(
          fiberRuntime.scopeMake(),
          core.flatMap((newScope) =>
            pipe(
              restore(
                pipe(
                  acquire,
                  core.mapInputContext<Exclude<R, Scope>, R>(
                    Context.add(fiberRuntime.scopeTag, newScope) as any
                  )
                )
              ),
              core.exit,
              core.flatMap(
                core.exitMatch({
                  onFailure: (cause) =>
                    pipe(
                      newScope.close(core.exitUnit),
                      effect.ignore,
                      core.as(
                        [
                          core.failCause(cause) as unknown as Effect<never, never, void>,
                          [oldScope, value] as const
                        ] as const
                      )
                    ),
                  onSuccess: (value) =>
                    pipe(
                      oldScope.close(core.exitUnit),
                      effect.ignore,
                      core.as([core.unit, [newScope, value] as const] as const)
                    )
                })
              )
            )
          )
        )
      ))
  ))
