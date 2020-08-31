import type { Clock } from "../Clock"
import { currentTime } from "../Clock"
import { pipe, tuple } from "../Function"
import type { Has } from "../Layer/deps"
import { chain, die, environment, uninterruptibleMask } from "../Layer/deps"
import * as O from "../Option"
import * as P from "../Promise"
import * as RefM from "../RefM"
import { provideAll } from "./core"
import { bind, of } from "./do"
import type { AsyncE, Effect, SyncR } from "./effect"
import { map } from "./map"
import { tap } from "./tap"
import { toPromise } from "./toPromise"

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 */
export function cached(ttl: number) {
  return <S, R, E, A>(fa: Effect<S, R, E, A>) => cached_(fa, ttl)
}

/**
 * Returns an effect that, if evaluated, will return the cached result of
 * this effect. Cached results will expire after `timeToLive` duration.
 */
export function cached_<S, R, E, A>(
  fa: Effect<S, R, E, A>,
  ttl: number
): SyncR<R & Has<Clock>, AsyncE<E, A>> {
  return pipe(
    of,
    bind("r", () => environment<R & Has<Clock>>()),
    bind("cache", () =>
      RefM.makeRefM<O.Option<readonly [number, P.Promise<E, A>]>>(O.none)
    ),
    map(({ cache, r }) => provideAll(r)(get(fa, ttl, cache)))
  )
}

function compute<S, R, E, A>(fa: Effect<S, R, E, A>, ttl: number, start: number) {
  return pipe(
    of,
    bind("p", () => P.make<E, A>()),
    tap(({ p }) => toPromise(p)(fa)),
    map(({ p }) => O.some(tuple(start + ttl, p)))
  )
}

function get<S, R, E, A>(
  fa: Effect<S, R, E, A>,
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
