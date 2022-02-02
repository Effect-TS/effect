import { Tuple } from "../../../collection/immutable/Tuple"
import { Option } from "../../../data/Option"
import * as Ref from "../../../io/Ref/Synchronized"
import type { HasClock } from "../../Clock"
import { currentTime } from "../../Clock"
import { Promise } from "../../Promise"
import type { IO, RIO, UIO } from "../definition"
import { Effect } from "../definition"

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
  timeToLive: number,
  __etsTrace?: string
): RIO<R & HasClock, Tuple<[IO<E, A>, UIO<void>]>> {
  return Effect.Do()
    .bind("r", () => Effect.environment<R & HasClock>())
    .bind("cache", () => Ref.make<Option<Tuple<[number, Promise<E, A>]>>>(Option.none))
    .map(({ cache, r }) =>
      Tuple(get(self, timeToLive, cache).provideEnvironment(r), invalidate(cache))
    )
}

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @ets_data_first cachedInvalidate_
 */
export function cachedInvalidate(timeToLive: number, __etsTrace?: string) {
  return <R, E, A>(
    self: Effect<R, E, A>
  ): RIO<R & HasClock, Tuple<[IO<E, A>, UIO<void>]>> =>
    self.cachedInvalidate(timeToLive)
}

function compute<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: number,
  start: number
): Effect<R & HasClock, never, Option<Tuple<[number, Promise<E, A>]>>> {
  return Effect.Do()
    .bind("p", () => Promise.make<E, A>())
    .tap(({ p }) => self.intoPromise(p))
    .map(({ p }) => Option.some(Tuple(start + timeToLive, p)))
}

function get<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: number,
  cache: Ref.Synchronized<Option<Tuple<[number, Promise<E, A>]>>>
): Effect<R & HasClock, E, A> {
  return Effect.uninterruptibleMask(({ restore }) =>
    currentTime.flatMap((time) =>
      Ref.updateSomeAndGetEffect_(cache, (_) =>
        _.fold(
          () => Option.some(compute(self, timeToLive, time)),
          ({ tuple: [end] }) =>
            end - time <= 0 ? Option.some(compute(self, timeToLive, time)) : Option.none
        )
      ).flatMap((a) =>
        a._tag === "None" ? Effect.die("Bug") : restore(a.value.get(1).await())
      )
    )
  )
}

function invalidate<E, A>(
  cache: Ref.Synchronized<Option<Tuple<[number, Promise<E, A>]>>>
): UIO<void> {
  return Ref.set_(cache, Option.none)
}
