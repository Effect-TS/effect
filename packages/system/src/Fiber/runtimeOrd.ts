import * as Ord from "../Ord"
import * as Ordering from "../Ordering"
import type * as Fiber from "./core"

export const runtimeOrd = <E, A>() =>
  Ord.makeOrd<Fiber.Runtime<E, A>>((x, y) =>
    Ordering.combine(
      Ord.number.compare(x.id.startTimeMillis, y.id.startTimeMillis),
      Ord.number.compare(x.id.seqNumber, y.id.seqNumber)
    )
  )
