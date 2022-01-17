import type * as Tp from "../../../Collections/Immutable/Tuple"
import { XSynchronized } from "../definition"
import * as T from "./_internal/effect"

/**
 * Combines this `Synchronized` with the specified `Synchronized` to create a
 * new `Synchronized` with the `get` and `set` values of both. The new
 * `Synchronized` value supports atomically modifying both of the underlying
 * `Synchronized` values.
 */
export function zip_<RA1, RB1, EA1, EB1, A1, B1, RA2, RB2, EA2, EB2, A2, B2>(
  self: XSynchronized<RA1, RB1, EA1, EB1, A1, B1>,
  that: XSynchronized<RA2, RB2, EA2, EB2, A2, B2>
): XSynchronized<
  RA1 & RA2,
  RB1 & RB2,
  EA1 | EA2,
  EB1 | EB2,
  Tp.Tuple<[A1, A2]>,
  Tp.Tuple<[B1, B2]>
> {
  return new XSynchronized(
    new Set([...self.semaphores, ...that.semaphores]),
    T.zip_(self.get, that.get),
    ({ tuple: [a, a2] }) => T.chain_(self.unsafeSet(a), () => that.unsafeSet(a2))
  )
}

/**
 * Combines this `Synchronized` with the specified `Synchronized` to create a
 * new `Synchronized` with the `get` and `set` values of both. The new
 * `Synchronized` value supports atomically modifying both of the underlying
 * `Synchronized` values.
 *
 * @ets_data_first zip_
 */
export function zip<RA2, RB2, EA2, EB2, A2, B2>(
  that: XSynchronized<RA2, RB2, EA2, EB2, A2, B2>
) {
  return <RA1, RB1, EA1, EB1, A1, B1>(
    self: XSynchronized<RA1, RB1, EA1, EB1, A1, B1>
  ): XSynchronized<
    RA1 & RA2,
    RB1 & RB2,
    EA1 | EA2,
    EB1 | EB2,
    Tp.Tuple<[A1, A2]>,
    Tp.Tuple<[B1, B2]>
  > => zip_(self, that)
}
