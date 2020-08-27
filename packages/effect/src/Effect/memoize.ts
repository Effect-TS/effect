import { pipe, tuple } from "../Function"
import * as P from "../Promise"
import * as RefM from "../RefM"
import { fork, succeed } from "./core"
import { bind, of } from "./do"
import type { AsyncRE, Effect, Sync } from "./effect"
import { map } from "./map"
import { tap } from "./tap"
import { toPromise } from "./toPromise"

/**
 * Returns a memoized version of the specified effectual function.
 */
export function memoize<A, S, R, E, B>(
  f: (a: A) => Effect<S, R, E, B>
): Sync<(a: A) => AsyncRE<R, E, B>> {
  return pipe(
    RefM.makeRefM(new Map<A, P.Promise<E, B>>()),
    map((ref) => (a: A) =>
      pipe(
        of,
        bind("promise", () =>
          pipe(
            ref,
            RefM.modify((m) => {
              const memo = m.get(a)

              if (memo) {
                return succeed(tuple(memo, m))
              }

              return pipe(
                of,
                bind("promise", () => P.make<E, B>()),
                tap(({ promise }) => fork(toPromise(promise)(f(a)))),
                map(({ promise }) => tuple(promise, m.set(a, promise)))
              )
            })
          )
        ),
        bind("b", ({ promise }) => P.wait(promise)),
        map(({ b }) => b)
      )
    )
  )
}

/**
 * Returns a memoized version of the specified effectual function.
 *
 * This variant uses the compare function to compare `A`
 */
export function memoizeEq<A>(compare: (r: A) => (l: A) => boolean) {
  return <S, R, E, B>(
    f: (a: A) => Effect<S, R, E, B>
  ): Sync<(a: A) => Effect<unknown, R, E, B>> =>
    pipe(
      RefM.makeRefM(new Map<A, P.Promise<E, B>>()),
      map((ref) => (a: A) =>
        pipe(
          of,
          bind("promise", () =>
            pipe(
              ref,
              RefM.modify((m) => {
                for (const [k, v] of Array.from(m)) {
                  if (compare(k)(a)) {
                    return succeed(tuple(v, m))
                  }
                }

                return pipe(
                  of,
                  bind("promise", () => P.make<E, B>()),
                  tap(({ promise }) => fork(toPromise(promise)(f(a)))),
                  map(({ promise }) => tuple(promise, m.set(a, promise)))
                )
              })
            )
          ),
          bind("b", ({ promise }) => P.wait(promise)),
          map(({ b }) => b)
        )
      )
    )
}
