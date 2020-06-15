import * as O from "../../Option"
import { succeedNow } from "../Effect/succeedNow"
import { unit } from "../Effect/unit"
import { Exit } from "../Exit/exit"

import { Syntetic } from "./fiber"

/**
 * A fiber that is done with the specified `Exit` value.
 */
export const done = <E, A>(exit: Exit<E, A>): Syntetic<E, A> => ({
  _tag: "SynteticFiber",
  wait: succeedNow(exit),
  children: succeedNow([]),
  getRef: (ref) => succeedNow(ref.initial),
  inheritRefs: unit,
  interruptAs: () => succeedNow(exit),
  poll: succeedNow(O.some(exit))
})
