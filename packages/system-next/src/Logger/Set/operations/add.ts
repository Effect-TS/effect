import * as Map from "../../../Collections/Immutable/Map"
import type { Tag } from "../../../Has"
import type { Logger } from "../../definition"
import { LoggerSet } from "../definition"

export function add_<C>(typeTag: Tag<C>) {
  return <A, B>(self: LoggerSet<A, B>, that: Logger<C, B>): LoggerSet<A & C, B> => {
    return new LoggerSet(Map.insert_(self.map, typeTag.key, that))
  }
}

export function add<C>(typeTag: Tag<C>) {
  return <B>(that: Logger<C, B>) => {
    return <A>(self: LoggerSet<A, B>): LoggerSet<A & C, B> => add_(typeTag)(self, that)
  }
}
