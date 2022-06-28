import type { _In, _Out } from "@effect/core/io/Metrics/MetricKeyType"

/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops fromMetricKey
 */
export function fromMetricKey<Type extends MetricKeyType<any, any>>(
  key: MetricKey<Type>
): Metric<
  Type,
  [Type] extends [{ [_In]: () => infer In }] ? In : never,
  [Type] extends [{ [_Out]: () => infer Out }] ? Out : never
> {
  const hook = (extraTags: HashSet<MetricLabel>): MetricHook<
    [Type] extends [{ [_In]: () => infer In }] ? In : never,
    [Type] extends [{ [_Out]: () => infer Out }] ? Out : never
  > => {
    const fullKey = key.taggedWithLabelSet(extraTags)
    return Metric.registry.value.get(fullKey)
  }
  return Metric(
    key.keyType,
    (input, extraTags) => hook(extraTags).update(input),
    (extraTags) => hook(extraTags).get()
  )
}
