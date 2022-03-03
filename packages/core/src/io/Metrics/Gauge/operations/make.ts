import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Effect } from "../../../Effect"
import type { MetricLabel } from "../../MetricLabel"
import type { Gauge } from "../definition"
import { InternalGauge } from "./_internal/InternalGauge"

/**
 * Creates a new gauge.
 *
 * @tsplus static ets/GaugeOps __call
 */
export function make<A>(
  name: string,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: Gauge<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Gauge<A> {
  return new InternalGauge(name, tags, aspect)
}
