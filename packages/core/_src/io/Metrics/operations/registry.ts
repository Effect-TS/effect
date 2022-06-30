/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops registry
 */
export const metricRegistry: LazyValue<MetricRegistry> = LazyValue.make(() => new MetricRegistry())
