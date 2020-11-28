import type * as A from "../../Array"
import type * as O from "../../Option"
import type * as T from "../_internal/effect"
import type * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Creates a new {@link Stream} from a managed effect that yields chunks.
 * The effect will be evaluated repeatedly until it fails with a `None`
 * (to signify stream end) or a `Some<E>` (to signify stream failure).
 *
 * The stream evaluation guarantees proper acquisition and release of the
 * {@link Managed}.
 */
export function apply<R, E, O>(
  proc: M.Managed<R, never, T.Effect<R, O.Option<E>, A.Array<O>>>
) {
  return new Stream<R, E, O>(proc)
}
