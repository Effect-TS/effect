import * as Tp from "../../../Collections/Immutable/Tuple"
import * as T from "../../../Effect"
import type * as Ex from "../../../Exit"
import type { Predicate } from "../../../Function"
import { pipe } from "../../../Function"
import type * as O from "../../../Option"
import * as Q from "../../../Queue"
import * as CC from "../_internal/api"
import * as C from "../_internal/core"

export class GroupBy<R, E, K, V> {
  constructor(
    readonly grouped: C.Stream<R, E, Tp.Tuple<[K, Q.Dequeue<Ex.Exit<O.Option<E>, V>>]>>,
    readonly buffer: number
  ) {}
}

/**
 * Only consider the first n groups found in the stream.
 */
export function first_<R, E, K, V>(
  self: GroupBy<R, E, K, V>,
  n: number
): GroupBy<R, E, K, V> {
  const g1 = pipe(
    self.grouped,
    CC.zipWithIndex,
    CC.filterEffect((elem) => {
      const {
        tuple: [
          {
            tuple: [_, q]
          },
          i
        ]
      } = elem

      if (i < n) {
        return T.as_(T.succeed(elem), true)
      } else {
        return T.as_(Q.shutdown(q), false)
      }
    }),
    C.map(Tp.get(0))
  )

  return new GroupBy(g1, self.buffer)
}

/**
 * Only consider the first n groups found in the stream.
 *
 * @ets_data_first first_
 */
export function first(n: number) {
  return <R, E, K, V>(self: GroupBy<R, E, K, V>) => first_(self, n)
}

/**
 * Filter the groups to be processed.
 */
export function filter_<R, E, K, V>(
  self: GroupBy<R, E, K, V>,
  f: Predicate<K>
): GroupBy<R, E, K, V> {
  const g1 = pipe(
    self.grouped,
    CC.filterEffect((elem) => {
      const {
        tuple: [k, q]
      } = elem

      if (f(k)) {
        return T.as_(T.succeed(elem), true)
      } else {
        return T.as_(Q.shutdown(q), false)
      }
    })
  )

  return new GroupBy(g1, self.buffer)
}

/**
 * Filter the groups to be processed.
 *
 * @ets_data_first filter_
 */
export function filter<K>(f: Predicate<K>) {
  return <R, E, V>(self: GroupBy<R, E, K, V>) => filter_(self, f)
}
