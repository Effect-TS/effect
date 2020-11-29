import type * as Ex from "../../Exit"
import { pipe } from "../../Function"
import type * as O from "../../Option"
import type * as Q from "../../Queue"
import * as T from "../_internal/effect"
import { chainPar } from "../Stream/chainPar"
import type { Stream } from "../Stream/definitions"
import { filterM } from "../Stream/filterM"
import { flattenExitOption } from "../Stream/flattenExitOption"
import { fromQueueWithShutdown } from "../Stream/fromQueueWithShutdown"
import { map } from "../Stream/map"
import { zipWithIndex } from "../Stream/zipWithIndex"

/**
 * Representation of a grouped stream.
 * This allows to filter which groups will be processed.
 * Once this is applied all groups will be processed in parallel and the results will
 * be merged in arbitrary order.
 */
export interface GroupBy<R, E, K, V> {
  readonly grouped: Stream<R, E, readonly [K, Q.Dequeue<Ex.Exit<O.Option<E>, V>>]>
  readonly buffer: number
  <A, R1, E1>(f: (k: K, stream: Stream<unknown, E, V>) => Stream<R1, E1, A>): Stream<
    R & R1,
    E | E1,
    A
  >
}

export function make<R, E, K, V>(
  grouped: Stream<R, E, readonly [K, Q.Dequeue<Ex.Exit<O.Option<E>, V>>]>,
  buffer: number
): GroupBy<R, E, K, V> {
  function GroupByApply<R1, E1, A>(
    f: (k: K, stream: Stream<unknown, E, V>) => Stream<R1, E1, A>
  ): Stream<R & R1, E | E1, A> {
    return pipe(
      grouped,
      chainPar(
        Number.MAX_SAFE_INTEGER,
        buffer
      )(([k, q]) => f(k, flattenExitOption(fromQueueWithShutdown(q))))
    )
  }

  return Object.assign(GroupByApply, { grouped, buffer }) as GroupBy<R, E, K, V>
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
    zipWithIndex,
    filterM((elem) => {
      const [[, q], i] = elem

      if (i < n) {
        return T.as_(T.succeed(elem), true)
      } else {
        return T.as_(q.shutdown, false)
      }
    }),
    map(([v]) => v)
  )

  return make(g1, self.buffer)
}

/**
 * Only consider the first n groups found in the stream.
 */
export function first(n: number) {
  return <R, E, K, V>(self: GroupBy<R, E, K, V>) => first_(self, n)
}

/**
 * Filter the groups to be processed.
 */
export function filter_<R, E, K, V>(
  self: GroupBy<R, E, K, V>,
  f: (k: K) => boolean
): GroupBy<R, E, K, V> {
  const g1 = pipe(
    self.grouped,
    filterM((elem) => {
      const [k, q] = elem

      if (f(k)) {
        return T.as_(T.succeed(elem), true)
      } else {
        return T.as_(q.shutdown, false)
      }
    })
  )

  return make(g1, self.buffer)
}

/**
 * Filter the groups to be processed.
 */
export function filter<R, E, K, V>(f: (k: K) => boolean) {
  return (self: GroupBy<R, E, K, V>) => filter_(self, f)
}
