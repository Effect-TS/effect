// tracing: off

import { pipe } from "../Function"
import * as I from "../Iterable"
import * as Ref from "../Ref"
import { chain, chain_, succeed, suspend } from "./core"
import type { Effect } from "./effect"
import * as forEach from "./excl-forEach"
import { zipWith_ } from "./zipWith"
import { zipWithPar_ } from "./zipWithPar"

/**
 * Merges an `Iterable[IO]` to a single IO, working sequentially.
 *
 * @dataFirst mergeAll_
 */
export function mergeAll<A, B>(zero: B, f: (b: B, a: A) => B, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, B> =>
    mergeAll_(as, zero, f, __trace)
}

/**
 * Merges an `Iterable[IO]` to a single IO, working sequentially.
 */
export function mergeAll_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B,
  __trace?: string
) {
  return suspend(
    () => I.reduce_(as, succeed(zero) as Effect<R, E, B>, (b, a) => zipWith_(b, a, f)),
    __trace
  )
}

/**
 * Merges an `Iterable[IO]` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @dataFirst mergeAllPar_
 */
export function mergeAllPar<A, B>(zero: B, f: (b: B, a: A) => B, __trace?: string) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, B> =>
    mergeAllPar_(as, zero, f, __trace)
}

/**
 * Merges an `Iterable[IO]` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export function mergeAllPar_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B,
  __trace?: string
) {
  return suspend(
    () =>
      I.reduce_(as, succeed(zero) as Effect<R, E, B>, (b, a) => zipWithPar_(b, a, f)),
    __trace
  )
}

/**
 * Merges an `Iterable[IO]` to a single IO, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 *
 * @dataFirst mergeAllParN_
 */
export function mergeAllParN<A, B>(
  n: number,
  zero: B,
  f: (b: B, a: A) => B,
  __trace?: string
) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, B> =>
    mergeAllParN_(as, n, zero, f, __trace)
}

/**
 * Merges an `Iterable[IO]` to a single IO, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export function mergeAllParN_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  n: number,
  zero: B,
  f: (b: B, a: A) => B,
  __trace?: string
): Effect<R, E, B> {
  return chain_(Ref.makeRef(zero), (acc) =>
    chain_(
      forEach.forEachUnitParN_(
        as,
        n,
        chain((a) =>
          pipe(
            acc,
            Ref.update((b) => f(b, a))
          )
        ),
        __trace
      ),
      () => acc.get
    )
  )
}
