import * as Map from "../../../../collection/immutable/Map"
import type { Has, Tag } from "../../../../data/Has"
import type { Logger } from "../../definition"
import { LoggerSet } from "../definition"

export function add_<C>(typeTag: Tag<C>) {
  return <A, B>(
    self: LoggerSet<A, B>,
    that: Logger<C, B>
  ): LoggerSet<A & Has<C>, B> => {
    return new LoggerSet(Map.insert_(self.map, typeTag.key, that))
  }
}

export function add<C>(typeTag: Tag<C>) {
  return <B>(that: Logger<C, B>) => {
    return <A>(self: LoggerSet<A, B>): LoggerSet<A & Has<C>, B> =>
      add_(typeTag)(self, that)
  }
}
