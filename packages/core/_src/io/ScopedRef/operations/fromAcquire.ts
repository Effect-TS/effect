import { ScopedRefInternal } from "@effect/core/io/ScopedRef/operations/_internal/ScopedRefInternal"

/**
 * Creates a new `ScopedRef` from an effect that resourcefully produces a
 * value.
 *
 * @tsplus static effect/core/io/ScopedRef.Ops fromAcquire
 */
export function fromAcquire<R, E, A>(acquire: Effect<R, E, A>): Effect<R | Scope, E, ScopedRef<A>> {
  return Effect.uninterruptibleMask(({ restore }) =>
    Do(($) => {
      const newScope = $(Scope.make)
      const a = $(
        restore(acquire.provideSomeEnvironment((env: Env<R>) => env.add(Scope.Tag, newScope)))
          .onError((cause) => newScope.close(Exit.fail(cause)))
      )
      const ref = $(Ref.Synchronized.make(Tuple(newScope, a)))
      const scopedRef = new ScopedRefInternal(ref)
      $(Effect.addFinalizer(scopedRef.close))
      return scopedRef
    })
  )
}
