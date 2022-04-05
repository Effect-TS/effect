/**
 * Effectfully accesses the specified service in the environment of the
 * effect.
 *
 * Especially useful for creating "accessor" methods on services' companion
 * objects.
 *
 * @tsplus static ets/Effect/Ops serviceWithEffect
 */
export function serviceWithEffect<T>(service: Service<T>) {
  return <R, E, A>(
    f: (a: T) => Effect<R, E, A>,
    __tsplusTrace?: string
  ): Effect<R & Has<T>, E, A> =>
    Effect.suspendSucceed(
      FiberRef.currentEnvironment.value
        .get()
        .flatMap((environment: Has<T>) => f(service.get(environment)))
    );
}
