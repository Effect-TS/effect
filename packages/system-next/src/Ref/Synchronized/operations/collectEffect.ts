import { identity } from "../../../Function"
import * as O from "../../../Option"
import type { XSynchronized } from "../definition"
import { foldEffect_ } from "../definition"
import * as T from "./_internal/effect"

/**
 * Maps and filters the `get` value of the `XRef.Synchronized` with the
 * specified effectual partial function, returning a `XRef.Synchronized`
 * with a `get` value that succeeds with the result of the partial function
 * if it is defined or else fails with `None`.
 */
export function collectEffect_<RA, RB, RC, EA, EB, EC, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  pf: (b: B) => O.Option<T.Effect<RC, EC, C>>
): XSynchronized<RA, RB & RC, EA, O.Option<EB | EC>, A, C> {
  return foldEffect_(self, identity, O.some, T.succeedNow, (b) =>
    O.fold_(pf(b), () => T.failNow(O.emptyOf<EB | EC>()), T.asSomeError)
  )
}

/**
 * Maps and filters the `get` value of the `XRef.Synchronized` with the
 * specified effectual partial function, returning a `XRef.Synchronized`
 * with a `get` value that succeeds with the result of the partial function
 * if it is defined or else fails with `None`.
 *
 * @ets_data_first collectEffect_
 */
export function collectEffect<RC, EC, B, C>(
  pf: (b: B) => O.Option<T.Effect<RC, EC, C>>
) {
  ;<RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB & RC, EA, O.Option<EB | EC>, A, C> => collectEffect_(self, pf)
}
