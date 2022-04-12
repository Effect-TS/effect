/**
 * Provides the computation with the single service it requires. If the
 * computation requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus fluent ets/Sync provideServiceSync
 */
export function provideServiceSync_<R, E, A, T>(
  self: Sync<R & Has<T>, E, A>,
  tag: Tag<T>
) {
  return <R1, E1>(
    sync: Sync<R1, E1, T>,
    __tsplusTrace?: string
  ): Sync<R1 & Erase<R, Has<T>>, E | E1, A> =>
    Sync.environmentWithSync((env: Env<R & R1>) => sync.flatMap((t) => self.provideEnvironment(env.add(tag, t))));
}

/**
 * Provides the computation with the single service it requires. If the
 * computation requires more than one service use `provideEnvironment` instead.
 *
 * @tsplus static ets/Sync/Aspects provideServiceSync
 */
export const provideServiceSync = Pipeable(provideServiceSync_);
