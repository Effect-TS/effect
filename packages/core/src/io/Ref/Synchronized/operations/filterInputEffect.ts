import { identity } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Filters the `set` value of the `XRef.Synchronized` with the specified
 * effectual predicate, returning a `XRef.Synchronized` with a `set` value
 * that succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @tsplus fluent ets/XSynchronized filterInputEffect
 */
export function filterInputEffect_<RA, RB, RC, EA, EB, EC, A, A1 extends A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (a: A1) => Effect<RC, EC, boolean>
): XSynchronized<RA & RC, RB, Option<EA | EC>, EB, A1, B> {
  return self.foldEffect(
    Option.some,
    identity,
    (a1) =>
      Effect.ifEffect(
        f(a1).asSomeError(),
        Effect.succeedNow(a1),
        Effect.failNow(Option.emptyOf())
      ),
    Effect.succeedNow
  )
}

/**
 * Filters the `set` value of the `XRef.Synchronized` with the specified
 * effectual predicate, returning a `XRef.Synchronized` with a `set` value
 * that succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @ets_data_first filterInputEffect_
 */
export function filterInputEffect<RC, EC, A, A1 extends A>(
  f: (a: A1) => Effect<RC, EC, boolean>
) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB, Option<EA | EC>, EB, A1, B> => self.filterInputEffect(f)
}
