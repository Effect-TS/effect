import { InternalGauge } from "@effect/core/io/Metrics/Gauge/operations/_internal/InternalGauge";

/**
 * Creates a new gauge.
 *
 * @tsplus static ets/Gauge/Ops __call
 */
export function make<A>(
  name: string,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: Gauge<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Gauge<A> {
  return new InternalGauge(name, tags, aspect);
}
