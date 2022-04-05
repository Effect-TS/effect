import { InternalSummary } from "@effect-ts/core/io/Metrics/Summary/operations/_internal/InternalSummary";

/**
 * Creates a new summary.
 *
 * @tsplus static ets/Summary/Ops __call
 */
export function make<A>(
  name: string,
  maxSize: number,
  maxAge: Duration,
  error: number,
  quantiles: Chunk<number>,
  tags: Chunk<MetricLabel>,
  aspect: (
    self: Summary<A>
  ) => <R, E, A1 extends A>(effect: Effect<R, E, A1>) => Effect<R, E, A1>
): Summary<A> {
  return new InternalSummary(name, maxSize, maxAge, error, quantiles, tags, aspect);
}
