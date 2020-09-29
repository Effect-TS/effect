import type { Clock } from "../Clock"
import { currentTime } from "../Clock"
import { pipe, tuple } from "../Function"
import type { Has } from "../Layer/deps"
import { chain, die, environment, uninterruptibleMask } from "../Layer/deps"
import * as O from "../Option"
import * as P from "../Promise"
import * as RefM from "../RefM"
import { provideAll } from "./core"
import * as Do from "./do"
import type { Effect, IO, RIO } from "./effect"
import { map } from "./map"
import { tap } from "./tap"
import { to } from "./to"

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 */
export function cached(ttl: number) {
  return <R, E, A>(fa: Effect<R, E, A>) => cached_(fa, ttl)
}

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 */
export function cached_<S, R, E, A>(
  fa: Effect<R, E, A>,
  ttl: number
): RIO<R & Has<Clock>, IO<E, A>> {
  return pipe(
    Do.do,
    Do.bind("r", () => environment<R & Has<Clock>>()),
    Do.bind("cache", () =>
      RefM.makeRefM<O.Option<readonly [number, P.Promise<E, A>]>>(O.none)
    ),
    map(({ cache, r }) => provideAll(r)(get(fa, ttl, cache)))
  )
}

function compute<R, E, A>(fa: Effect<R, E, A>, ttl: number, start: number) {
  return pipe(
    Do.do,
    Do.bind("p", () => P.make<E, A>()),
    tap(({ p }) => to(p)(fa)),
    map(({ p }) => O.some(tuple(start + ttl, p)))
  )
}

function get<R, E, A>(
  fa: Effect<R, E, A>,
  ttl: number,
  cache: RefM.RefM<O.Option<readonly [number, P.Promise<E, A>]>>
) {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      currentTime,
      chain((time) =>
        pipe(
          cache,
          RefM.updateSomeAndGet((o) =>
            pipe(
              o,
              O.fold(
                () => O.some(compute(fa, ttl, time)),
                ([end]) => (end - time <= 0 ? O.some(compute(fa, ttl, time)) : O.none)
              )
            )
          ),
          chain((a) => (a._tag === "None" ? die("bug") : restore(P.await(a.value[1]))))
        )
      )
    )
  )
}
