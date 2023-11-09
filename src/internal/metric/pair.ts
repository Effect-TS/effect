import type { MetricKey } from "../../exports/MetricKey.js"
import type { MetricKeyType } from "../../exports/MetricKeyType.js"
import type { MetricPair } from "../../exports/MetricPair.js"
import type { MetricState } from "../../exports/MetricState.js"
import { pipeArguments } from "../../exports/Pipeable.js"

/** @internal */
const MetricPairSymbolKey = "effect/MetricPair"

/** @internal */
export const MetricPairTypeId: MetricPair.MetricPairTypeId = Symbol.for(
  MetricPairSymbolKey
) as MetricPair.MetricPairTypeId

/** @internal */
const metricPairVariance = {
  _Type: (_: never) => _
}

/** @internal */
export const make = <Type extends MetricKeyType<any, any>>(
  metricKey: MetricKey<Type>,
  metricState: MetricState<MetricKeyType.OutType<Type>>
): MetricPair.Untyped => {
  return {
    [MetricPairTypeId]: metricPairVariance,
    metricKey,
    metricState,
    pipe() {
      return pipeArguments(this, arguments)
    }
  }
}

/** @internal */
export const unsafeMake = <Type extends MetricKeyType<any, any>>(
  metricKey: MetricKey<Type>,
  metricState: MetricState.Untyped
): MetricPair.Untyped => {
  return {
    [MetricPairTypeId]: metricPairVariance,
    metricKey,
    metricState,
    pipe() {
      return pipeArguments(this, arguments)
    }
  }
}
