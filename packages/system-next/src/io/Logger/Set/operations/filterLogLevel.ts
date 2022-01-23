import * as Map from "../../../../collection/immutable/Map"
import type { LogLevel } from "../../../LogLevel"
import type { Option } from "../../../../data/Option"
import * as LoggerFilter from "../../operations/filterLogLevel"
import { LoggerSet } from "../definition"

export function filterLogLevel_<A, B>(
  self: LoggerSet<A, B>,
  f: (logLevel: LogLevel) => boolean
): LoggerSet<A, Option<B>> {
  return new LoggerSet(Map.map_(self.map, (_) => LoggerFilter.filterLogLevel_(_, f)))
}

/**
 * @ets_data_first filterLogLevel_
 */
export function filterLogLevel(f: (logLevel: LogLevel) => boolean) {
  return <A, B>(self: LoggerSet<A, B>): LoggerSet<A, Option<B>> =>
    filterLogLevel_(self, f)
}
