/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @tsplus fluent ets/Effect cachedInvalidate
 */
export function cachedInvalidate_<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: Duration,
  __tsplusTrace?: string
): RIO<R, Tuple<[IO<E, A>, UIO<void>]>> {
  return Effect.Do()
    .bind("r", () => Effect.environment<R>())
    .bind("cache", () => SynchronizedRef.make<Option<Tuple<[number, Deferred<E, A>]>>>(Option.none))
    .map(({ cache, r }) => Tuple(get(self, timeToLive, cache).provideEnvironment(r), invalidate(cache)));
}

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @tsplus static ets/Effect/Aspects cachedInvalidate
 */
export const cachedInvalidate = Pipeable(cachedInvalidate_);

function compute<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: Duration,
  start: number
): Effect<R, never, Option<Tuple<[number, Deferred<E, A>]>>> {
  return Effect.Do()
    .bind("deferred", () => Deferred.make<E, A>())
    .tap(({ deferred }) => self.intoDeferred(deferred))
    .map(({ deferred }) => Option.some(Tuple(start + timeToLive.millis, deferred)));
}

function get<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: Duration,
  cache: SynchronizedRef<Option<Tuple<[number, Deferred<E, A>]>>>
): Effect<R, E, A> {
  return Effect.uninterruptibleMask(({ restore }) =>
    Clock.currentTime.flatMap((time) =>
      cache
        .updateSomeAndGetEffect((_) =>
          _.fold(
            () => Option.some(compute(self, timeToLive, time)),
            ({ tuple: [end] }) =>
              end - time <= 0
                ? Option.some(compute(self, timeToLive, time))
                : Option.none
          )
        )
        .flatMap((a) => a._tag === "None" ? Effect.die("Bug") : restore(a.value.get(1).await()))
    )
  );
}

function invalidate<E, A>(
  cache: SynchronizedRef<Option<Tuple<[number, Deferred<E, A>]>>>
): UIO<void> {
  return cache.set(Option.none);
}
