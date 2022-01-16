// ets_tracing: off

import { identity } from "../../../Function"
import * as O from "../../../Option"
import type { XSynchronized } from "../definition"
import { foldEffect_ } from "../definition"
import * as T from "./_internal/effect"

/**
 * Filters the `set` value of the `XRef.Synchronized` with the specified
 * effectual predicate, returning a `XRef.Synchronized` with a `set` value
 * that succeeds if the predicate is satisfied or else fails with `None`.
 */
export function filterInputEffect_<RA, RB, RC, EA, EB, EC, A, A1 extends A, B>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (a: A1) => T.Effect<RC, EC, boolean>
): XSynchronized<RA & RC, RB, O.Option<EA | EC>, EB, A1, B> {
  return foldEffect_(
    self,
    O.some,
    identity,
    (a1) =>
      T.ifEffect_(
        T.asSomeError(f(a1)),
        () => T.succeedNow(a1),
        () => T.failNow(O.emptyOf())
      ),
    T.succeedNow
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
  f: (a: A1) => T.Effect<RC, EC, boolean>
) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RC, RB, O.Option<EA | EC>, EB, A1, B> =>
    filterInputEffect_(self, f)
}
