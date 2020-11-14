import { pipe } from "../Function"
import * as I from "../Iterable"
import * as Ref from "../Ref"
import { chain, chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { foreachUnitParN_ } from "./foreachUnitParN_"
import { zipWith_ } from "./zipWith_"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Merges an `Iterable[IO]` to a single IO, working sequentially.
 */
export function mergeAll<A, B>(zero: B, f: (b: B, a: A) => B) {
  return <R, E>(as: Iterable<Effect<R, E, A>>): Effect<R, E, B> =>
    mergeAll_(as, zero, f)
}

/**
 * Merges an `Iterable[IO]` to a single IO, working sequentially.
 */
export function mergeAll_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  zero: B,
  f: (b: B, a: A) => B
) {
  return I.reduce_(as, succeed(zero) as Effect<R, E, B>, (b, a) => zipWith_(b, a, f))
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
export function mergeAllPar<B>(zero: B) {
  return <A>(f: (b: B, a: A) => B) => <R, E>(
    as: Iterable<Effect<R, E, A>>
  ): Effect<R, E, B> => mergeAllPar_(as, zero, f)
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
  f: (b: B, a: A) => B
) {
  return I.reduce_(as, succeed(zero) as Effect<R, E, B>, (b, a) => zipWithPar_(b, a, f))
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
export function mergeAllParN(n: number) {
  return <B>(zero: B) => <A>(f: (b: B, a: A) => B) => <R, E>(
    as: Iterable<Effect<R, E, A>>
  ): Effect<R, E, B> => mergeAllParN_(n)(as, zero, f)
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
export function mergeAllParN_(n: number) {
  return <R, E, A, B>(
    as: Iterable<Effect<R, E, A>>,
    zero: B,
    f: (b: B, a: A) => B
  ): Effect<R, E, B> =>
    chain_(Ref.makeRef(zero), (acc) =>
      chain_(
        foreachUnitParN_(n)(
          as,
          chain((a) =>
            pipe(
              acc,
              Ref.update((b) => f(b, a))
            )
          )
        ),
        () => acc.get
      )
    )
}
