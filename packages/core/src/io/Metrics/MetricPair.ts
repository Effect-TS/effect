import type { _Out } from "@effect/core/io/Metrics/MetricKeyType"

/**
 * @tsplus type effect/core/io/Metrics/MetricPair
 * @category model
 * @since 1.0.0
 */
export interface MetricPair<Type extends MetricKeyType<any, any>> {
  readonly metricKey: MetricKey<Type>
  readonly metricState: MetricState<
    [Type] extends [{ [_Out]: () => infer Out }] ? Out : never
  >
}

/**
 * @tsplus type effect/core/io/Metrics/MetricPair.Ops
 * @category model
 * @since 1.0.0
 */
export interface MetricPairOps {}
export const MetricPair: MetricPairOps = {}

/**
 * @since 1.0.0
 */
export declare namespace MetricPair {
  export type Untyped = MetricPair<MetricKeyType<any, any>>
}

/**
 * @tsplus static effect/core/io/Metrics/MetricPair.Ops make
 * @category constructors
 * @since 1.0.0
 */
export function make<Type extends MetricKeyType<any, any>>(
  metricKey: MetricKey<Type>,
  metricState: MetricState<
    [Type] extends [{ [_Out]: () => infer Out }] ? Out : never
  >
): MetricPair.Untyped {
  return { metricKey, metricState }
}

/**
 * @tsplus static effect/core/io/Metrics/MetricPair.Ops unsafeMake
 * @category constructors
 * @since 1.0.0
 */
export function unsafeMake<Type extends MetricKeyType<any, any>>(
  metricKey: MetricKey<Type>,
  metricState: MetricState.Untyped
): MetricPair.Untyped {
  return { metricKey, metricState }
}
