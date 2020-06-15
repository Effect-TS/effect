import { chain_ as effectChain_ } from "../Effect/chain_"
import { Sync } from "../Effect/effect"
import { foreach_ as effectForeach_ } from "../Effect/foreach_"
import { map_ as effectMap_ } from "../Effect/map_"
import * as IT from "../Iterable"

import { Fiber, Runtime } from "./fiber"

/**
 * Descendants of the fiber (children and their children, recursively).
 */
export const descendants = <E, A>(
  fiber: Fiber<E, A>
): Sync<Iterable<Runtime<any, any>>> =>
  effectChain_(fiber.children, (children) =>
    effectMap_(
      effectForeach_(children, (f) => descendants(f)),
      (collected) => IT.concat(children, IT.flatten(collected))
    )
  )
