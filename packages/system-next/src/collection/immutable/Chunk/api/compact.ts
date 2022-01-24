import type { Option } from "../../../../data/Option"
import type * as Chunk from "../core"
import { collect_ } from "./collect"

/**
 * Filter out optional values
 */
export function compact<A>(fa: Chunk.Chunk<Option<A>>): Chunk.Chunk<A> {
  return collect_(fa, (x: Option<A>) => x)
}
