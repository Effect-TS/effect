/**
 * Imports an asynchronous effect into a pure `Effect` value. This formulation
 * is necessary when the effect is itself expressed in terms of an `Effect`.
 *
 * @tsplus static ets/Effect/Ops asyncEffect
 */
export function asyncEffect<R, E, A, R2, E2, X>(
  register: (callback: (_: Effect<R, E, A>) => void) => Effect<R2, E2, X>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, A> {
  return Do(($) => {
    const deferred = $(Deferred.make<E | E2, A>());
    const runtime = $(Effect.runtime<R & R2>());
    return $(
      Effect.uninterruptibleMask(({ restore }) =>
        restore(
          register((k) => runtime.unsafeRunAsync(k.intoDeferred(deferred)))
            .catchAllCause((cause) => deferred.failCause(cause as Cause<E | E2>))
        ).fork() > restore(deferred.await())
      )
    );
  });
}
