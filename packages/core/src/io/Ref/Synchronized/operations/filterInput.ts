import type { Predicate, Refinement } from "../../../../data/Function"
import type { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Filters the `set` value of the `XRef.Synchronized` with the specified
 * predicate, returning a `XRef.Synchronized` with a `set` value that
 * succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @tsplus fluent ets/XSynchronized filterInput
 */
export function filterInput_<RA, RB, EA, EB, A, A1 extends A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: Refinement<A, A1>
): XSynchronized<RA, RB, Option<EA>, EB, A1, B>
export function filterInput_<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: Predicate<A>
): XSynchronized<RA, RB, Option<EA>, EB, A, B>
export function filterInput_<RA, RB, EA, EB, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: Predicate<A>
): XSynchronized<RA, RB, Option<EA>, EB, A, B> {
  return self.filterInputEffect((a) => Effect.succeedNow(f(a)))
}

/**
 * Filters the `set` value of the `XRef.Synchronized` with the specified
 * predicate, returning a `XRef.Synchronized` with a `set` value that
 * succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @ets_data_first filterInput_
 */
export function filterInput<A, A1 extends A>(
  f: Refinement<A, A1>
): <RA, RB, EA, EB, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>
) => XSynchronized<RA, RB, Option<EA>, EB, A1, B>
export function filterInput<A>(
  f: Predicate<A>
): <RA, RB, EA, EB, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>
) => XSynchronized<RA, RB, Option<EA>, EB, A, B>
export function filterInput<A>(f: Predicate<A>) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, Option<EA>, EB, A, B> => self.filterInput(f)
}
