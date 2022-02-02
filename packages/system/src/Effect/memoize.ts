// ets_tracing: off

import * as Tp from "../Collections/Immutable/Tuple/index.js"
import { pipe } from "../Function/index.js"
import { await as promiseAwait } from "../Promise/await.js"
import type { Promise } from "../Promise/index.js"
import { make as promiseMake } from "../Promise/make.js"
import * as RefM from "../RefM/index.js"
import { fork, succeed } from "./core.js"
import * as Do from "./do.js"
import type { Effect, UIO } from "./effect.js"
import * as map from "./map.js"
import * as tap from "./tap.js"
import * as to from "./to.js"

/**
 * Returns a memoized version of the specified effectual function.
 */
export function memoize<A, R, E, B>(
  f: (a: A) => Effect<R, E, B>,
  __trace?: string
): UIO<(a: A) => Effect<R, E, B>> {
  return pipe(
    RefM.makeRefM(new Map<A, Promise<E, B>>()),
    map.map(
      (ref) => (a: A) =>
        pipe(
          Do.do,
          Do.bind("promise", () =>
            pipe(
              ref,
              RefM.modify((m) => {
                const memo = m.get(a)

                if (memo) {
                  return succeed(Tp.tuple(memo, m))
                }

                return pipe(
                  Do.do,
                  Do.bind("promise", () => promiseMake<E, B>()),
                  tap.tap(({ promise }) => fork(to.to(promise)(f(a)))),
                  map.map(({ promise }) => Tp.tuple(promise, m.set(a, promise)))
                )
              })
            )
          ),
          Do.bind("b", ({ promise }) => promiseAwait(promise)),
          map.map(({ b }) => b)
        ),
      __trace
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
      RefM.makeRefM(new Map<A, Promise<E, B>>()),
      map.map(
        (ref) => (a: A) =>
          pipe(
            Do.do,
            Do.bind("promise", () =>
              pipe(
                ref,
                RefM.modify((m) => {
                  for (const [k, v] of m) {
                    if (compare(k)(a)) {
                      return succeed(Tp.tuple(v, m))
                    }
                  }

                  return pipe(
                    Do.do,
                    Do.bind("promise", () => promiseMake<E, B>()),
                    tap.tap(({ promise }) => fork(to.to(promise)(f(a)))),
                    map.map(({ promise }) => Tp.tuple(promise, m.set(a, promise)))
                  )
                })
              )
            ),
            Do.bind("b", ({ promise }) => promiseAwait(promise)),
            map.map(({ b }) => b)
          )
      )
    )
}
