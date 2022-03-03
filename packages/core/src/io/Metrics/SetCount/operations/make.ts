import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Effect } from "../../../Effect"
import type { MetricLabel } from "../../MetricLabel"
import type { SetCount } from "../definition"
import { InternalSetCount } from "./_internal/InternalSetCount"

/**
 * Creates a new set count.
 *
 * @tsplus static ets/SetCountOps __call
 */
export function make<A>(
  name: string,
  setTag: string,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: SetCount<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): SetCount<A> {
  return new InternalSetCount(name, setTag, tags, aspect)
}
