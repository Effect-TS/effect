// ets_tracing: off

import type { Option } from "../../../../Option/index.js"
import type * as Chunk from "../core.js"
import { collect_ } from "./collect.js"

/**
 * Filter out optional values
 */
export function compact<A>(fa: Chunk.Chunk<Option<A>>): Chunk.Chunk<A> {
  return collect_(fa, (x: Option<A>) => x)
}
