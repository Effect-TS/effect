import * as O from "../../Option"
import { chain_ } from "../Effect/chain_"
import { AsyncE } from "../Effect/effect"
import { map_ } from "../Effect/map_"
import { succeedNow } from "../Effect/succeedNow"
import { foreach } from "../Exit/foreach"
import { foreach_ } from "../Exit/foreach_"

import { Syntetic, Fiber } from "./fiber"

/**
 * Effectually maps over the value the fiber computes.
 */
export const mapM = <E2, A, B>(f: (a: A) => AsyncE<E2, B>) => <E>(
  fiber: Fiber<E, A>
): Syntetic<E | E2, B> => ({
  _tag: "SynteticFiber",
  wait: chain_(fiber.wait, foreach(f)),
  getRef: (ref) => fiber.getRef(ref),
  inheritRefs: fiber.inheritRefs,
  interruptAs: (id) => chain_(fiber.interruptAs(id), foreach(f)),
  poll: chain_(
    fiber.poll,
    O.fold(
      () => succeedNow(O.none),
      (a) => map_(foreach_(a, f), O.some)
    )
  )
})
