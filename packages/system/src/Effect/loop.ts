// tracing: off

import { traceAs } from "@effect-ts/tracing-utils"

import { pipe } from "../Function"
import * as L from "../Persistent/List"
import * as core from "./core"
import type { Effect } from "./effect"
import * as map from "./map"

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * ```
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 * ```
 *
 * @trace 1
 * @trace 2
 */
export function loop<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return (
    /**
     * @trace 0
     */
    <R, E, A>(body: (z: Z) => Effect<R, E, A>): Effect<R, E, readonly A[]> => {
      return map.map_(loopInternal_(initial, cont, inc, body), (x) =>
        Array.from(L.reverse(x))
      )
    }
  )
}

function loopInternal_<Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect<R, E, A>
): Effect<R, E, L.MutableList<A>> {
  return core.suspend(
    traceAs(cont, () => {
      if (cont(initial)) {
        return core.chain_(core.suspend(traceAs(body, () => body(initial))), (a) =>
          pipe(
            core.effectTotal(traceAs(inc, () => inc(initial))),
            core.chain((x) => loopInternal_(x, cont, inc, body)),
            map.map((as) => {
              L.push(a, as)
              return as
            })
          )
        )
      }
      return core.effectTotal(() => L.emptyPushable())
    })
  )
}

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * ```
 * var s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 *
 * @trace 1
 * @trace 2
 */
export function loopUnit<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return (
    /**
     * @trace 0
     */
    <R, E, X>(body: (z: Z) => Effect<R, E, X>): Effect<R, E, void> => {
      return core.suspend(
        traceAs(cont, () => {
          if (cont(initial)) {
            return core.chain_(core.suspend(traceAs(body, () => body(initial))), () =>
              core.chain_(core.effectTotal(traceAs(inc, () => inc(initial))), (x) =>
                loopUnit(x, cont, inc)(body)
              )
            )
          }
          return core.unit
        })
      )
    }
  )
}
