import { constVoid } from "@fp-ts/data/Function"

/**
 * Creates a metric that ignores input and produces constant output.
 *
 * @tsplus static effect/core/io/Metrics/Metric.Ops succeed
 * @category constructors
 * @since 1.0.0
 */
export function succeed<Out>(out: LazyArg<Out>): Metric<void, unknown, Out> {
  return Metric(
    undefined,
    constVoid,
    out
  )
}
