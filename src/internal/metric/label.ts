import { Equal } from "../../exports/Equal.js"
import { pipe } from "../../exports/Function.js"
import { Hash } from "../../exports/Hash.js"
import type { MetricLabel } from "../../exports/MetricLabel.js"
import { pipeArguments } from "../../exports/Pipeable.js"
import { hasProperty } from "../../exports/Predicate.js"

/** @internal */
const MetricLabelSymbolKey = "effect/MetricLabel"

/** @internal */
export const MetricLabelTypeId: MetricLabel.MetricLabelTypeId = Symbol.for(
  MetricLabelSymbolKey
) as MetricLabel.MetricLabelTypeId

/** @internal */
class MetricLabelImpl implements MetricLabel {
  readonly [MetricLabelTypeId]: MetricLabel.MetricLabelTypeId = MetricLabelTypeId
  constructor(readonly key: string, readonly value: string) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(MetricLabelSymbolKey),
      Hash.combine(Hash.hash(this.key)),
      Hash.combine(Hash.hash(this.value))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return isMetricLabel(that) &&
      this.key === that.key &&
      this.value === that.value
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const make = (key: string, value: string): MetricLabel => {
  return new MetricLabelImpl(key, value)
}

/** @internal */
export const isMetricLabel = (u: unknown): u is MetricLabel => hasProperty(u, MetricLabelTypeId)
