import { identity } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import { Effect } from "../../../Effect"
import type { XSynchronized } from "../definition"

/**
 * Filters the `get` value of the `XRef.Synchronized` with the specified
 * effectual predicate, returning a `XRef.Synchronized` with a `get` value
 * that succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @tsplus fluent ets/XSynchronized filterOutputEffect
 */
export function filterOutputEffect_<RA, RB, RC, EA, EB, EC, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => Effect<RC, EC, boolean>
): XSynchronized<RA, RB & RC, EA, Option<EB | EC>, A, B> {
  return self.foldEffect(identity, Option.some, Effect.succeedNow, (b) =>
    Effect.ifEffect(
      f(b).asSomeError(),
      Effect.succeedNow(b),
      Effect.failNow(Option.emptyOf())
    )
  )
}

/**
 * Filters the `get` value of the `XRef.Synchronized` with the specified
 * effectual predicate, returning a `XRef.Synchronized` with a `get` value
 * that succeeds if the predicate is satisfied or else fails with `None`.
 *
 * @ets_data_first filterOutputEffect_
 */
export function filterOutputEffect<RC, EC, B>(f: (a: B) => Effect<RC, EC, boolean>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB & RC, EA, Option<EB | EC>, A, B> => self.filterOutputEffect(f)
}
