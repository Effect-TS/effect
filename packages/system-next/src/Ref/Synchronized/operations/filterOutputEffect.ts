import { identity } from "../../../Function"
import * as O from "../../../Option"
import type { XSynchronized } from "../definition"
import { foldEffect_ } from "../definition"
import * as T from "./_internal/effect"

/**
 * Filters the `get` value of the `XRef.Synchronized` with the specified
 * effectual predicate, returning a `XRef.Synchronized` with a `get` value
 * that succeeds if the predicate is satisfied or else fails with `None`.
 */
export function filterOutputEffect_<RA, RB, RC, EA, EB, EC, A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => T.Effect<RC, EC, boolean>
): XSynchronized<RA, RB & RC, EA, O.Option<EB | EC>, A, B> {
  return foldEffect_(self, identity, O.some, T.succeedNow, (b) =>
    T.ifEffect_(
      T.asSomeError(f(b)),
      () => T.succeedNow(b),
      () => T.failNow(O.emptyOf())
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
export function filterOutputEffect<RC, EC, B>(f: (a: B) => T.Effect<RC, EC, boolean>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB & RC, EA, O.Option<EB | EC>, A, B> =>
    filterOutputEffect_(self, f)
}
