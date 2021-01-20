import { pipe, tuple } from "../Function"
import * as P from "../Promise"
import * as RefM from "../RefM"
import { fork, succeed } from "./core"
import * as Do from "./do"
import type { Effect, UIO } from "./effect"
import { map } from "./map"
import { tap } from "./tap"
import { to } from "./to"

/**
 * Returns a memoized version of the specified effectual function.
 */
export function memoize<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>
): UIO<(a: A) => Effect<R, E, B>> {
  return pipe(
    RefM.makeRefM(new Map<A, P.Promise<E, B>>()),
    map((ref) => (a: A) =>
      pipe(
        Do.do,
        Do.bind("promise", () =>
          pipe(
            ref,
            RefM.modify((m) => {
              const memo = m.get(a)

              if (memo) {
                return succeed(tuple(memo, m))
              }

              return pipe(
                Do.do,
                Do.bind("promise", () => P.make<E, B>()),
                tap(({ promise }) => fork(to(promise)(f(a)))),
                map(({ promise }) => tuple(promise, m.set(a, promise)))
              )
            })
          )
        ),
        Do.bind("b", ({ promise }) => P.await(promise)),
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
  return <R, E, B>(f: (a: A) => Effect<R, E, B>): UIO<(a: A) => Effect<R, E, B>> =>
    pipe(
      RefM.makeRefM(new Map<A, P.Promise<E, B>>()),
      map((ref) => (a: A) =>
        pipe(
          Do.do,
          Do.bind("promise", () =>
            pipe(
              ref,
              RefM.modify((m) => {
                for (const [k, v] of Array.from(m)) {
                  if (compare(k)(a)) {
                    return succeed(tuple(v, m))
                  }
                }

                return pipe(
                  Do.do,
                  Do.bind("promise", () => P.make<E, B>()),
                  tap(({ promise }) => fork(to(promise)(f(a)))),
                  map(({ promise }) => tuple(promise, m.set(a, promise)))
                )
              })
            )
          ),
          Do.bind("b", ({ promise }) => P.await(promise)),
          map(({ b }) => b)
        )
      )
    )
}
