import type { Option } from "../../../../Option"
import type * as Chunk from "../core"
import { collectChunk_ } from "./collectChunk"

/**
 * Filter out optional values
 */
export function compact<A>(fa: Chunk.Chunk<Option<A>>): Chunk.Chunk<A> {
  return collectChunk_(fa, (x: Option<A>) => x)
}
