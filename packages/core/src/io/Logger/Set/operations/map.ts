import * as Map from "../../../../collection/immutable/Map"
import * as LoggerMap from "../../operations/map"
import { LoggerSet } from "../definition"

export function map_<A, B, C>(self: LoggerSet<A, B>, f: (b: B) => C): LoggerSet<A, C> {
  return new LoggerSet(Map.map_(self.map, LoggerMap.map(f)))
}

/**
 * @ets_data_first map_
 */
export function map<B, C>(f: (b: B) => C) {
  return <A>(self: LoggerSet<A, B>): LoggerSet<A, C> => map_(self, f)
}
