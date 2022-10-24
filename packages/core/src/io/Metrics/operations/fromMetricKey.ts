import type { _In, _Out } from "@effect/core/io/Metrics/MetricKeyType"
import type { HashSet } from "@fp-ts/data/HashSet"

/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops fromMetricKey
 * @category constructors
 * @since 1.0.0
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
    return Metric.registry.get(fullKey)
  }
  return Metric(
    key.keyType,
    (input, extraTags) => hook(extraTags).update(input),
    (extraTags) => hook(extraTags).get()
  )
}
