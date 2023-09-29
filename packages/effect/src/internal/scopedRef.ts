import * as Context from "../Context"
import type * as Effect from "../Effect"
import type { LazyArg } from "../Function"
import { dual, pipe } from "../Function"
import * as core from "../internal/core"
import * as effect from "../internal/core-effect"
import * as circular from "../internal/effect/circular"
import * as fiberRuntime from "../internal/fiberRuntime"
import * as ref from "../internal/ref"
import * as synchronized from "../internal/synchronizedRef"
import { pipeArguments } from "../Pipeable"
import type * as Scope from "../Scope"
import type * as ScopedRef from "../ScopedRef"

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
const close = <A>(self: ScopedRef.ScopedRef<A>): Effect.Effect<never, never, void> =>
  core.flatMap(ref.get(self.ref), (tuple) => tuple[0].close(core.exitUnit))

/** @internal */
export const fromAcquire = <R, E, A>(
  acquire: Effect.Effect<R, E, A>
): Effect.Effect<R | Scope.Scope, E, ScopedRef.ScopedRef<A>> =>
  core.uninterruptibleMask((restore) =>
    pipe(
      fiberRuntime.scopeMake(),
      core.flatMap((newScope) =>
        pipe(
          restore(
            pipe(
              acquire,
              core.mapInputContext<R, Scope.Scope | R>(Context.add(fiberRuntime.scopeTag, newScope))
            )
          ),
          core.onError((cause) => newScope.close(core.exitFail(cause))),
          core.flatMap((value) =>
            pipe(
              circular.makeSynchronized([newScope, value] as const),
              core.flatMap((ref) => {
                const scopedRef: ScopedRef.ScopedRef<A> = {
                  [ScopedRefTypeId]: scopedRefVariance,
                  pipe() {
                    return pipeArguments(this, arguments)
                  },
                  ref
                }
                return pipe(
                  fiberRuntime.addFinalizer<R | Scope.Scope, void>(() => close(scopedRef)),
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
export const get = <A>(self: ScopedRef.ScopedRef<A>): Effect.Effect<never, never, A> =>
  core.map(ref.get(self.ref), (tuple) => tuple[1])

/** @internal */
export const make = <A>(evaluate: LazyArg<A>): Effect.Effect<Scope.Scope, never, ScopedRef.ScopedRef<A>> =>
  fromAcquire(core.sync(evaluate))

/** @internal */
export const set = dual<
  <A, R, E>(
    acquire: Effect.Effect<R, E, A>
  ) => (self: ScopedRef.ScopedRef<A>) => Effect.Effect<Exclude<R, Scope.Scope>, E, void>,
  <A, R, E>(
    self: ScopedRef.ScopedRef<A>,
    acquire: Effect.Effect<R, E, A>
  ) => Effect.Effect<Exclude<R, Scope.Scope>, E, void>
>(2, <A, R, E>(
  self: ScopedRef.ScopedRef<A>,
  acquire: Effect.Effect<R, E, A>
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
                  core.mapInputContext<Exclude<R, Scope.Scope>, R>(
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
                          core.failCause(cause) as unknown as Effect.Effect<never, never, void>,
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
