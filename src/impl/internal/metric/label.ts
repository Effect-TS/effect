import * as Equal from "../../Equal.js"
import { pipe } from "../../Function.js"
import * as Hash from "../../Hash.js"
import type * as MetricLabel from "../../MetricLabel.js"
import { pipeArguments } from "../../Pipeable.js"
import { hasProperty } from "../../Predicate.js"

/** @internal */
const MetricLabelSymbolKey = "effect/MetricLabel"

/** @internal */
export const MetricLabelTypeId: MetricLabel.MetricLabelTypeId = Symbol.for(
  MetricLabelSymbolKey
) as MetricLabel.MetricLabelTypeId

/** @internal */
class MetricLabelImpl implements MetricLabel.MetricLabel {
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
export const make = (key: string, value: string): MetricLabel.MetricLabel => {
  return new MetricLabelImpl(key, value)
}

/** @internal */
export const isMetricLabel = (u: unknown): u is MetricLabel.MetricLabel => hasProperty(u, MetricLabelTypeId)
