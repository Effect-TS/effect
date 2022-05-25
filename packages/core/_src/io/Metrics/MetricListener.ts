import type { _In } from "@effect/core/io/Metrics/MetricKeyType"

/**
 * A `MetricListener` is capable of taking some action in response to a metric
 * being recorded, such as sending that metric to a third-party service.
 *
 * @tsplus type ets/Metrics/MetricListener
 */
export class MetricListener {
  constructor(
    readonly unsafeUpdate: <Type extends MetricKeyType<any, any>>(key: MetricKey<Type>) => (
      _: [typeof key["keyType"]] extends [{ [_In]: () => infer In }] ? In : never
    ) => void
  ) {}

  unsafeUpdateCache<Type extends MetricKeyType<any, any>>(key: MetricKey<Type>): (
    _: [typeof key["keyType"]] extends [{ [_In]: () => infer In }] ? In : never
  ) => void {
    return this.unsafeUpdate(key)
  }
}
