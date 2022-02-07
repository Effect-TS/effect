// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import type * as O from "../../Option/index.js"
import type * as T from "../_internal/effect.js"
import type * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

/**
 * Creates a new {@link Stream} from a managed effect that yields chunks.
 * The effect will be evaluated repeatedly until it fails with a `None`
 * (to signify stream end) or a `Some<E>` (to signify stream failure).
 *
 * The stream evaluation guarantees proper acquisition and release of the
 * {@link Managed}.
 */
export function apply<R, E, O>(
  proc: M.Managed<R, never, T.Effect<R, O.Option<E>, A.Chunk<O>>>
) {
  return new Stream<R, E, O>(proc)
}
