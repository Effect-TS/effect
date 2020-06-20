import * as O from "../../Option"
import { chain_ as effectChain_ } from "../Effect/chain_"
import { zipWith_ as effectZipWith_ } from "../Effect/zipWith_"

import { Fiber, Syntetic } from "./fiber"

/**
 * Returns a fiber that prefers `this` fiber, but falls back to the
 * `that` one when `this` one fails. Interrupting the returned fiber
 * will interrupt both fibers, sequentially, from left to right.
 */
export const orElse = <E1, A1>(that: Fiber<E1, A1>) => <E, A>(
  fiber: Fiber<E, A>
): Syntetic<E | E1, A | A1> => ({
  _tag: "SynteticFiber",
  wait: effectZipWith_(fiber.wait, that.wait, (a, b) => (a._tag === "Success" ? a : b)),
  getRef: (ref) =>
    effectZipWith_(fiber.getRef(ref), that.getRef(ref), (a, b) =>
      a === ref.initial ? b : a
    ),
  inheritRefs: effectChain_(fiber.inheritRefs, () => that.inheritRefs),
  interruptAs: (id) => effectChain_(fiber.interruptAs(id), () => that.interruptAs(id)),
  poll: effectZipWith_(fiber.poll, that.poll, (a, b) => {
    switch (a._tag) {
      case "Some": {
        return a.value._tag === "Success" ? a : b
      }
      case "None": {
        return O.none
      }
    }
  })
})
