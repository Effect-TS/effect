// ets_tracing: off

import * as Map from "../../../Collections/Immutable/Map"
import { LoggerSet } from "../definition"

export function empty<A>(): LoggerSet<unknown, A> {
  return new LoggerSet(Map.empty)
}
