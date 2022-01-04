import type { Option } from "../../../../Option"
import type * as Chunk from "../core"
import { filterMap_ } from "./filterMap"

/**
 * Filter out optional values
 */
export function compact<A>(fa: Chunk.Chunk<Option<A>>): Chunk.Chunk<A> {
  return filterMap_(fa, (x: Option<A>) => x)
}
