// ets_tracing: off
import * as Collect from "../Collections/Immutable/Chunk/api/collect.js"
import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import { identity, pipe } from "../Function/index.js"
import * as I from "../Iterable/index.js"
import type * as O from "../Option/index.js"
import type { Async } from "./core.js"
import * as core from "./core.js"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `Chunk<B>`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 */
export function forEach_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Async<R, E, B>
): Async<R, E, Chunk.Chunk<B>> {
  return core.suspend(() => {
    const acc: B[] = []

    return core.map_(
      forEachUnit_(as, (a) =>
        core.map_(f(a), (b) => {
          acc.push(b)
        })
      ),
      () => Chunk.from(acc)
    )
  })
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `Chunk<B>`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 *
 * @ets_data_first forEach_
 */
export function forEach<A, R, E, B>(f: (a: A) => Async<R, E, B>) {
  return (as: Iterable<A>) => forEach_(as, f)
}

function forEachUnitLoop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Async<R, E, X>
): Async<R, E, void> {
  const next = iterator.next()
  return next.done
    ? core.unit
    : core.chain_(f(next.value), () => forEachUnitLoop(iterator, f))
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 */
export function forEachUnit_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Async<R, E, X>
): Async<R, E, void> {
  return core.suspend(() => forEachUnitLoop(as[Symbol.iterator](), f))
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @ets_data_first forEachUnit_
 */
export function forEachUnit<R, E, A, X>(
  f: (a: A) => Async<R, E, X>
): (as: Iterable<A>) => Async<R, E, void> {
  return (as) => forEachUnit_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 *
 * Additionally, interrupts all effects on any failure.
 */
export function forEachUnitPar_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Async<R, E, X>
): Async<R, E, void> {
  return pipe(
    core.environment<R>(),
    core.chain((env) =>
      core.promise(
        (onInterrupt) => {
          return new Promise((resolve, reject) => {
            const is = new core.InterruptionState()
            const promises: Array<Promise<void>> = []
            onInterrupt(() => {
              is.interrupt()
            })
            const interruptOnFailure = (ex: core.Exit<E, X>) => {
              if (ex._tag === "Failure" && !is.interrupted) {
                is.interrupt()
                reject(ex.e)
              }
            }
            for (const a of as) {
              promises.push(
                core.runPromiseExitEnv(f(a), env, is).then(interruptOnFailure)
              )
            }

            Promise.all(promises).then(() => {
              resolve()
            })
          })
        },
        (e: unknown) => e as E
      )
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `forEach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 *
 * @ets_data_first forEachUnitPar_
 */
export function forEachUnitPar<R, E, A, X>(f: (a: A) => Async<R, E, X>) {
  return (as: Iterable<A>) => forEachUnitPar_(as, f)
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 *
 * For a sequential version of this method, see `forEach`.
 */
export function forEachPar_<R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => Async<R, E, B>
): Async<R, E, Chunk.Chunk<B>> {
  return core.suspend(() =>
    core.chain_(
      core.succeedWith<B[]>(() => []),
      (array) =>
        core.map_(
          forEachUnitPar_(
            I.map_(as, (a, n) => [a, n] as [A, number]),
            ([a, n]) =>
              core.chain_(
                core.suspend(() => f(a)),
                (b) =>
                  core.succeedWith(() => {
                    array[n] = b
                  })
              )
          ),
          () => Chunk.from(array)
        )
    )
  )
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `Chunk<B>`.
 *
 * For a sequential version of this method, see `forEach`.
 *
 * @ets_data_first forEachPar_
 */
export function forEachPar<R, E, A, B>(f: (a: A) => Async<R, E, B>) {
  return (as: Iterable<A>): Async<R, E, Chunk.Chunk<B>> => forEachPar_(as, f)
}

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export function collectAll<R, E, A>(as: Iterable<Async<R, E, A>>) {
  return forEach_(as, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 */
export function collectAllPar<R, E, A>(as: Iterable<Async<R, E, A>>) {
  return forEachPar_(as, identity)
}

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export function collectAllUnit<R, E, A>(as: Iterable<Async<R, E, A>>) {
  return forEachUnit_(as, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 */
export function collectAllUnitPar<R, E, A>(as: Iterable<Async<R, E, A>>) {
  return forEachUnitPar_(as, identity)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Async<R, E, A>>,
  pf: (a: A) => O.Option<B>
): Async<R, E, Chunk.Chunk<B>> {
  return core.map_(collectAll(as), Collect.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => O.Option<B>) {
  return <R, E>(as: Iterable<Async<R, E, A>>) => collectAllWith_(as, pf)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWithPar_<R, E, A, B>(
  as: Iterable<Async<R, E, A>>,
  pf: (a: A) => O.Option<B>
): Async<R, E, Chunk.Chunk<B>> {
  return core.map_(collectAllPar(as), Collect.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWithPar_
 */
export function collectAllWithPar<A, B>(pf: (a: A) => O.Option<B>) {
  return <R, E>(as: Iterable<Async<R, E, A>>) => collectAllWithPar_(as, pf)
}
