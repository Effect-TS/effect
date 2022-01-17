import type { HasClock } from "../../Clock"
import { currentTime } from "../../Clock"
import * as Tp from "../../Collections/Immutable/Tuple"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as P from "../../Promise"
import * as Ref from "../../Ref/Synchronized"
import type { Effect, IO, RIO, UIO } from "../definition"
import { chain_ } from "./chain"
import { die } from "./die"
import * as Do from "./do"
import { environment } from "./environment"
import { uninterruptibleMask } from "./interruption"
import { intoPromise_ } from "./intoPromise"
import { map } from "./map"
import { provideEnvironment_ } from "./provideEnvironment"
import { tap } from "./tap"

/**
 * Returns an effect that, if evaluated, will return the cached result of this
 * effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 */
export function cachedInvalidate_<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: number,
  __trace?: string
): RIO<R & HasClock, Tp.Tuple<[IO<E, A>, UIO<void>]>> {
  return pipe(
    Do.do,
    Do.bind("r", () => environment<R & HasClock>()),
    Do.bind("cache", () =>
      Ref.make<O.Option<Tp.Tuple<[number, P.Promise<E, A>]>>>(O.none)
    ),
    map(
      ({ cache, r }) =>
        Tp.tuple(
          provideEnvironment_(get(self, timeToLive, cache), r),
          invalidate(cache)
        ),
      __trace
    )
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
export function cachedInvalidate(timeToLive: number, __trace?: string) {
  return <R, E, A>(
    self: Effect<R, E, A>
  ): RIO<R & HasClock, Tp.Tuple<[IO<E, A>, UIO<void>]>> =>
    cachedInvalidate_(self, timeToLive, __trace)
}

function compute<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: number,
  start: number
): Effect<R & HasClock, never, O.Option<Tp.Tuple<[number, P.Promise<E, A>]>>> {
  return pipe(
    Do.do,
    Do.bind("p", () => P.make<E, A>()),
    tap(({ p }) => intoPromise_(self, p)),
    map(({ p }) => O.some(Tp.tuple(start + timeToLive, p)))
  )
}

function get<R, E, A>(
  self: Effect<R, E, A>,
  timeToLive: number,
  cache: Ref.Synchronized<O.Option<Tp.Tuple<[number, P.Promise<E, A>]>>>
): Effect<R & HasClock, E, A> {
  return uninterruptibleMask(({ restore }) =>
    chain_(currentTime, (time) =>
      chain_(
        Ref.updateSomeAndGetEffect_(
          cache,
          O.fold(
            () => O.some(compute(self, timeToLive, time)),
            ({ tuple: [end] }) =>
              end - time <= 0 ? O.some(compute(self, timeToLive, time)) : O.none
          )
        ),
        (a) => (a._tag === "None" ? die("Bug") : restore(P.await(a.value.get(1))))
      )
    )
  )
}

function invalidate<E, A>(
  cache: Ref.Synchronized<O.Option<Tp.Tuple<[number, P.Promise<E, A>]>>>
): UIO<void> {
  return Ref.set_(cache, O.none)
}
