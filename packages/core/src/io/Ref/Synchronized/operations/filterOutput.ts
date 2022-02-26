import type { Predicate, Refinement } from "../../../../data/Function"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Filters the `get` value of the `XRef.Synchronized` with the specified
 * predicate, returning a `XRef.Synchronized` with a `get` value that
 * succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @tsplus fluent ets/XSynchronized filterOutput
 */
export function filterOutput_<RA, RB, EA, EB, A, B, B1 extends B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: Refinement<B, B1>
): XSynchronized<RA, RB, EA, Option<EB>, A, B1>
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: Predicate<B>
): XSynchronized<RA, RB, EA, Option<EB>, A, B>
export function filterOutput_<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: Predicate<B>
): XSynchronized<RA, RB, EA, Option<EB>, A, B> {
  return self.filterOutputEffect((b) => Effect.succeedNow(f(b)))
}

/**
 * Filters the `get` value of the `XRef.Synchronized` with the specified
 * predicate, returning a `XRef.Synchronized` with a `get` value that
 * succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @ets_data_first filterOutput_
 */
export function filterOutput<B, B1 extends B>(
  f: Refinement<B, B1>
): <RA, RB, EA, EB, A>(
  self: XSynchronized<RA, RB, EA, EB, A, B>
) => XSynchronized<RA, RB, EA, Option<EB>, A, B>
export function filterOutput<B>(
  f: Predicate<B>
): <RA, RB, EA, EB, A>(
  self: XSynchronized<RA, RB, EA, EB, A, B>
) => XSynchronized<RA, RB, EA, Option<EB>, A, B>
export function filterOutput<B>(f: Predicate<B>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA, Option<EB>, A, B> => self.filterOutput(f)
}
