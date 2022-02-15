import type { Tag } from "../../../../data/Has"
import type { Logger } from "../../definition"
import type { LoggerSet } from "../definition"

export function getAll_<A, B, C>(
  self: LoggerSet<A, B>,
  typeTag: Tag<C>
): ReadonlySet<Logger<C, B>> {
  return self.getAll(typeTag)
}

/**
 * @ets_data_first getAll_
 */
export function getAll<C>(typeTag: Tag<C>) {
  return <A, B>(self: LoggerSet<A, B>): ReadonlySet<Logger<C, B>> =>
    getAll_(self, typeTag)
}
