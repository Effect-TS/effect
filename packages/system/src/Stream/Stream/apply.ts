import type { Array } from "../../Array"
import type { Effect } from "../../Effect"
import type { Managed } from "../../Managed"
import type { Option } from "../../Option"
import { Stream } from "./definitions"

/**
 * Creates a new {@link Stream} from a managed effect that yields chunks.
 * The effect will be evaluated repeatedly until it fails with a `None`
 * (to signify stream end) or a `Some<E>` (to signify stream failure).
 *
 * The stream evaluation guarantees proper acquisition and release of the
 * {@link Managed}.
 */
export const apply = <S, R, E, O>(
  proc: Managed<S, R, never, Effect<S, R, Option<E>, Array<O>>>
) => new Stream<S, R, E, O>(proc)
