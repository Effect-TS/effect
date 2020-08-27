import { pipe } from "../Function"
import * as I from "../Iterable"
import * as Ref from "../Ref"
import { chain, chain_, succeed } from "./core"
import type { AsyncRE, Effect } from "./effect"
import { foreachUnitParN_ } from "./foreachUnitParN_"
import { zipWith_ } from "./zipWith_"
import { zipWithPar_ } from "./zipWithPar_"

/**
 * Merges an `Iterable[IO]` to a single IO, working sequentially.
 */
export function mergeAll<B>(zero: B) {
  return <A>(f: (b: B, a: A) => B) => <S, R, E>(
    as: Iterable<Effect<S, R, E, A>>
  ): Effect<S, R, E, B> =>
    I.reduce_(as, succeed(zero) as Effect<S, R, E, B>, (b, a) => zipWith_(b, a, f))
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
  return <A>(f: (b: B, a: A) => B) => <S, R, E>(
    as: Iterable<Effect<S, R, E, A>>
  ): AsyncRE<R, E, B> =>
    I.reduce_(as, succeed(zero) as AsyncRE<R, E, B>, (b, a) => zipWithPar_(b, a, f))
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
  return <B>(zero: B) => <A>(f: (b: B, a: A) => B) => <S, R, E>(
    as: Iterable<Effect<S, R, E, A>>
  ): AsyncRE<R, E, B> =>
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
