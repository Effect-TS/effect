import { constVoid } from "@tsplus/stdlib/data/Function";

/**
 * Creates a metric that ignores input and produces constant output.
 *
 * @tsplus static ets/Metrics/Metric/Ops succeed
 */
export function succeed<Out>(out: LazyArg<Out>): Metric<void, unknown, Out> {
  return new Metric(
    undefined,
    constVoid,
    out
  );
}
