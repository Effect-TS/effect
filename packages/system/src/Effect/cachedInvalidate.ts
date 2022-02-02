// ets_tracing: off

import type { Clock } from "../Clock"
import { currentTime } from "../Clock"
import * as Tp from "../Collections/Immutable/Tuple"
import { pipe } from "../Function"
import type { Has } from "../Has"
import * as O from "../Option"
import * as Ref from "../RefM"
import * as core from "./core"
import * as die from "./die"
import * as Do from "./do"
import type { Effect, IO, RIO, UIO } from "./effect"
import { environment } from "./environment"
import * as P from "./excl-forEach-promise"
import * as uninterruptibleMask from "./interruption"
import * as map from "./map"
import * as tap from "./tap"
import * as to from "./to"

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 *
 * @ets_data_first cachedInvalidate_
 */
export function cachedInvalidate(ttl: number, __trace?: string) {
  return <R, E, A>(fa: Effect<R, E, A>) => cachedInvalidate_(fa, ttl)
}

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration. In
 * addition, returns an effect that can be used to invalidate the current
 * cached value before the `timeToLive` duration expires.
 */
export function cachedInvalidate_<R, E, A>(
  fa: Effect<R, E, A>,
  ttl: number,
  __trace?: string
): RIO<R & Has<Clock>, Tp.Tuple<[IO<E, A>, UIO<void>]>> {
  return pipe(
    Do.do,
    Do.bind("r", () => environment<R & Has<Clock>>()),
    Do.bind("cache", () =>
      Ref.makeRefM<O.Option<Tp.Tuple<[number, P.Promise<E, A>]>>>(O.none)
    ),
    map.map(
      ({ cache, r }) =>
        Tp.tuple<[IO<E, A>, UIO<void>]>(
          core.provideAll(r)(get(fa, ttl, cache)),
          invalidate(cache)
        ),
      __trace
    )
  )
}

function invalidate<E, A>(
  cache: Ref.RefM<O.Option<Tp.Tuple<[number, P.Promise<E, A>]>>>
) {
  return cache.set(O.none)
}

function compute<R, E, A>(fa: Effect<R, E, A>, ttl: number, start: number) {
  return pipe(
    Do.do,
    Do.bind("p", () => P.make<E, A>()),
    tap.tap(({ p }) => to.to(p)(fa)),
    map.map(({ p }) => O.some(Tp.tuple(start + ttl, p)))
  )
}

function get<R, E, A>(
  fa: Effect<R, E, A>,
  ttl: number,
  cache: Ref.RefM<O.Option<Tp.Tuple<[number, P.Promise<E, A>]>>>
) {
  return uninterruptibleMask.uninterruptibleMask(({ restore }) =>
    pipe(
      currentTime,
      core.chain((time) =>
        pipe(
          cache,
          Ref.updateSomeAndGet((o) =>
            pipe(
              o,
              O.fold(
                () => O.some(compute(fa, ttl, time)),
                ({ tuple: [end] }) =>
                  end - time <= 0 ? O.some(compute(fa, ttl, time)) : O.none
              )
            )
          ),
          core.chain((a) =>
            a._tag === "None" ? die.die("bug") : restore(P.await(a.value.get(1)))
          )
        )
      )
    )
  )
}
