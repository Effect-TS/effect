import * as order from "@fp-ts/core/typeclass/Order"
import { pipe } from "@fp-ts/data/Function"
import * as Number from "@fp-ts/data/Number"

/**
 * @tsplus static effect/core/io/LogLevel.Ops Order
 */
export const Order: order.Order<LogLevel> = pipe(
  Number.Order,
  order.contramap((level: LogLevel) => level.ordinal)
)
