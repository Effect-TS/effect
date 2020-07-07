import { asUnit } from "../Effect/asUnit"
import { chain_ } from "../Effect/chain_"
import { Async } from "../Effect/effect"
import { unit } from "../Effect/unit"
import * as IT from "../Iterable"

import { Fiber } from "./fiber"
import { FiberID } from "./id"

/**
 * Interrupts all fibers as by the specified fiber, awaiting their interruption.
 */
export const interruptAllAs = (id: FiberID) => (fs: Iterable<Fiber<any, any>>) =>
  IT.reduce_(fs, unit as Async<void>, (io, f) =>
    asUnit(chain_(io, () => f.interruptAs(id)))
  )
