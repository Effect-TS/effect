// ets_tracing: off

import * as Ord from "../Ord/index.js"
import * as Ordering from "../Ordering/index.js"
import type * as Fiber from "./core.js"

export const runtimeOrd = <E, A>() =>
  Ord.makeOrd<Fiber.Runtime<E, A>>((x, y) =>
    Ordering.combine(
      Ord.number.compare(x.id.startTimeMillis, y.id.startTimeMillis),
      Ord.number.compare(x.id.seqNumber, y.id.seqNumber)
    )
  )
