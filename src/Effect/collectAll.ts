import * as A from "../Array"
import { flow, identity } from "../Function"
import * as I from "../Iterable"
import * as O from "../Option"
import * as core from "./core"
import type { Effect } from "./effect"
import * as foreach from "./foreach"
import * as foreachPar from "./foreachPar_"
import * as foreachParN from "./foreachParN_"
import * as foreachUnitParN from "./foreachUnitParN_"
import * as map from "./map"

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export function collectAll<R, E, A>(as: Iterable<Effect<R, E, A>>) {
  return foreach.foreach_(as, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 */
export function collectAllPar<R, E, A>(as: Iterable<Effect<R, E, A>>) {
  return foreachPar.foreachPar_(as, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 */
export function collectAllParN(n: number) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    foreachParN.foreachParN_(n)(as, identity)
}

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export function collectAllUnit<R, E, A>(as: Iterable<Effect<R, E, A>>) {
  return foreach.foreachUnit_(as, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 */
export function collectAllUnitPar<R, E, A>(as: Iterable<Effect<R, E, A>>) {
  return foreach.foreachUnitPar_(as, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 */
export function collectAllUnitParN(n: number) {
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    foreachUnitParN.foreachUnitParN_(n)(as, identity)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>
): Effect<R, E, readonly B[]> {
  return map.map_(collectAll(as), flow(A.map(pf), A.compact))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWith<A, B>(pf: (a: A) => O.Option<B>) {
  return <R, E>(as: Iterable<Effect<R, E, A>>) => collectAllWith_(as, pf)
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWithPar_<R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>
): Effect<R, E, readonly B[]> {
  return map.map_(collectAllPar(as), flow(A.map(pf), A.compact))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWithPar<A, B>(pf: (a: A) => O.Option<B>) {
  return <R, E>(as: Iterable<Effect<R, E, A>>) => collectAllWithPar_(as, pf)
}

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * Unlike `collectAllWithPar`, this method will use at most up to `n` fibers.
 */
export function collectAllWithParN_(
  n: number
): <R, E, A, B>(
  as: Iterable<Effect<R, E, A>>,
  pf: (a: A) => O.Option<B>
) => Effect<R, E, readonly B[]> {
  const c = collectAllParN(n)
  return (as, pf) => map.map_(c(as), flow(A.map(pf), A.compact))
}

/**
 * Evaluate each effect in the structure with `collectAllPar`, and collect
 * the results with given partial function.
 *
 * Unlike `collectAllWithPar`, this method will use at most up to `n` fibers.
 */
export function collectAllWithParN(
  n: number
): <A, B>(
  pf: (a: A) => O.Option<B>
) => <R, E>(as: Iterable<Effect<R, E, A>>) => Effect<R, E, readonly B[]> {
  const c = collectAllWithParN_(n)
  return (pf) => (as) => c(as, pf)
}

/**
 * Evaluate and run each effect in the structure and collect discarding failed ones.
 */
export function collectAllSuccesses<R, E, A>(as: Iterable<Effect<R, E, A>>) {
  return collectAllWith_(I.map_(as, core.result), (e) =>
    e._tag === "Success" ? O.some(e.value) : O.none
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 */
export function collectAllSuccessesPar<R, E, A>(as: Iterable<Effect<R, E, A>>) {
  return collectAllWithPar_(I.map_(as, core.result), (e) =>
    e._tag === "Success" ? O.some(e.value) : O.none
  )
}

/**
 * Evaluate and run each effect in the structure in parallel, and collect discarding failed ones.
 *
 * Unlike `collectAllSuccessesPar`, this method will use at most up to `n` fibers.
 */
export function collectAllSuccessesParN(n: number) {
  const c = collectAllWithParN_(n)
  return <R, E, A>(as: Iterable<Effect<R, E, A>>) =>
    c(I.map_(as, core.result), (e) => (e._tag === "Success" ? O.some(e.value) : O.none))
}
