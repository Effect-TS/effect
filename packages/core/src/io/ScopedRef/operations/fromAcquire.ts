import { ScopedRefInternal } from "@effect/core/io/ScopedRef/operations/_internal/ScopedRefInternal"
import * as Context from "@fp-ts/data/Context"

/**
 * Creates a new `ScopedRef` from an effect that resourcefully produces a
 * value.
 *
 * @tsplus static effect/core/io/ScopedRef.Ops fromAcquire
 * @category constructors
 * @since 1.0.0
 */
export function fromAcquire<R, E, A>(acquire: Effect<R, E, A>): Effect<R | Scope, E, ScopedRef<A>> {
  return Effect.uninterruptibleMask(({ restore }) =>
    Do(($) => {
      const newScope = $(Scope.make)
      const a = $(
        restore(acquire.provideSomeEnvironment<E, A, R, Scope | R>(
          Context.add(Scope.Tag)(newScope)
        )).onError((cause) => newScope.close(Exit.fail(cause)))
      )
      const ref = $(Ref.Synchronized.make([newScope, a] as const))
      const scopedRef = new ScopedRefInternal(ref)
      $(Effect.addFinalizer(scopedRef.close))
      return scopedRef
    })
  )
}
