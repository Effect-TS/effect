import type { HrTime } from "@opentelemetry/api"
import { ValueType } from "@opentelemetry/api"
import type * as Resources from "@opentelemetry/resources"
import type {
  CollectionResult,
  DataPoint,
  MetricCollectOptions,
  MetricData,
  MetricDescriptor,
  MetricProducer,
  MetricReader
} from "@opentelemetry/sdk-metrics"
import { AggregationTemporality, DataPointType, InstrumentType } from "@opentelemetry/sdk-metrics"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Metric from "effect/Metric"
import type * as MetricKey from "effect/MetricKey"
import * as MetricKeyType from "effect/MetricKeyType"
import * as MetricState from "effect/MetricState"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Resource from "../Resource.js"

const sdkName = "@effect/opentelemetry/Metrics"

/** @internal */
export class MetricProducerImpl implements MetricProducer {
  constructor(readonly resource: Resources.Resource) {
  }

  collect(_options?: MetricCollectOptions): Promise<CollectionResult> {
    const snapshot = Metric.unsafeSnapshot()
    const hrTimeNow = currentHrTime()
    const metricData: Array<MetricData> = []

    for (let i = 0, len = snapshot.length; i < len; i++) {
      const { metricKey, metricState } = snapshot[i]
      const attributes = ReadonlyArray.reduce(metricKey.tags, {}, (acc: Record<string, string>, label) => {
        acc[label.key] = label.value
        return acc
      })
      const descriptor = descriptorFromKey(metricKey, attributes)

      if (MetricState.isCounterState(metricState)) {
        metricData.push({
          dataPointType: DataPointType.SUM,
          descriptor,
          isMonotonic: descriptor.type === InstrumentType.COUNTER,
          aggregationTemporality: AggregationTemporality.CUMULATIVE,
          dataPoints: [{
            startTime: hrTimeNow,
            endTime: hrTimeNow,
            attributes,
            value: Number(metricState.count)
          }]
        })
      } else if (MetricState.isGaugeState(metricState)) {
        metricData.push({
          dataPointType: DataPointType.GAUGE,
          descriptor,
          aggregationTemporality: AggregationTemporality.CUMULATIVE,
          dataPoints: [{
            startTime: hrTimeNow,
            endTime: hrTimeNow,
            attributes,
            value: Number(metricState.value)
          }]
        })
      } else if (MetricState.isHistogramState(metricState)) {
        const size = metricState.buckets.length
        const buckets = {
          boundaries: Array<number>(size - 1),
          counts: Array<number>(size)
        }
        let i = 0
        let prev = 0
        for (const [boundary, value] of metricState.buckets) {
          if (i < size - 1) {
            buckets.boundaries[i] = boundary
          }
          buckets.counts[i] = value - prev
          prev = value
          i++
        }

        metricData.push({
          dataPointType: DataPointType.HISTOGRAM,
          descriptor,
          aggregationTemporality: AggregationTemporality.CUMULATIVE,
          dataPoints: [{
            startTime: hrTimeNow,
            endTime: hrTimeNow,
            attributes,
            value: {
              buckets,
              count: metricState.count,
              min: metricState.min,
              max: metricState.max,
              sum: metricState.sum
            }
          }]
        })
      } else if (MetricState.isFrequencyState(metricState)) {
        const dataPoints: Array<DataPoint<number>> = []
        for (const [freqKey, value] of metricState.occurrences) {
          dataPoints.push({
            startTime: hrTimeNow,
            endTime: hrTimeNow,
            attributes: {
              ...attributes,
              key: freqKey
            },
            value
          })
        }
        metricData.push({
          dataPointType: DataPointType.SUM,
          descriptor: descriptorFromKey(metricKey, attributes),
          aggregationTemporality: AggregationTemporality.CUMULATIVE,
          isMonotonic: true,
          dataPoints
        })
      } else if (MetricState.isSummaryState(metricState)) {
        const dataPoints: Array<DataPoint<number>> = [{
          startTime: hrTimeNow,
          endTime: hrTimeNow,
          attributes: { ...attributes, quantile: "min" },
          value: metricState.min
        }]
        for (const [quantile, value] of metricState.quantiles) {
          dataPoints.push({
            startTime: hrTimeNow,
            endTime: hrTimeNow,
            attributes: { ...attributes, quantile: quantile.toString() },
            value: value._tag === "Some" ? value.value : 0
          })
        }
        dataPoints.push({
          startTime: hrTimeNow,
          endTime: hrTimeNow,
          attributes: { ...attributes, quantile: "max" },
          value: metricState.max
        })

        metricData.push({
          dataPointType: DataPointType.SUM,
          descriptor: descriptorFromKey(metricKey, attributes, "quantiles"),
          aggregationTemporality: AggregationTemporality.CUMULATIVE,
          isMonotonic: false,
          dataPoints
        })
        metricData.push({
          dataPointType: DataPointType.SUM,
          descriptor: {
            ...descriptorMeta(metricKey, "count"),
            unit: "1",
            type: InstrumentType.COUNTER,
            valueType: ValueType.INT
          },
          aggregationTemporality: AggregationTemporality.CUMULATIVE,
          isMonotonic: true,
          dataPoints: [{
            startTime: hrTimeNow,
            endTime: hrTimeNow,
            attributes,
            value: metricState.count
          }]
        })
        metricData.push({
          dataPointType: DataPointType.SUM,
          descriptor: {
            ...descriptorMeta(metricKey, "sum"),
            unit: "1",
            type: InstrumentType.COUNTER,
            valueType: ValueType.DOUBLE
          },
          aggregationTemporality: AggregationTemporality.CUMULATIVE,
          isMonotonic: true,
          dataPoints: [{
            startTime: hrTimeNow,
            endTime: hrTimeNow,
            attributes,
            value: metricState.sum
          }]
        })
      }
    }

    return Promise.resolve({
      resourceMetrics: {
        resource: this.resource,
        scopeMetrics: [{
          scope: { name: sdkName },
          metrics: metricData
        }]
      },
      errors: []
    })
  }
}

const descriptorMeta = (
  metricKey: MetricKey.MetricKey.Untyped,
  suffix?: string
) => ({
  name: suffix ? `${metricKey.name}_${suffix}` : metricKey.name,
  description: Option.getOrElse(metricKey.description, () => "")
})

const descriptorFromKey = (
  metricKey: MetricKey.MetricKey.Untyped,
  tags: Record<string, string>,
  suffix?: string
): MetricDescriptor => ({
  ...descriptorMeta(metricKey, suffix),
  unit: tags.unit ?? tags.time_unit ?? "1",
  type: instrumentTypeFromKey(metricKey),
  valueType: "bigint" in metricKey.keyType && metricKey.keyType.bigint === true ? ValueType.INT : ValueType.DOUBLE
})

const instrumentTypeFromKey = (key: MetricKey.MetricKey.Untyped): InstrumentType => {
  if (MetricKeyType.isHistogramKey(key.keyType)) {
    return InstrumentType.HISTOGRAM
  } else if (MetricKeyType.isGaugeKey(key.keyType)) {
    return InstrumentType.OBSERVABLE_GAUGE
  } else if (MetricKeyType.isFrequencyKey(key.keyType)) {
    return InstrumentType.COUNTER
  } else if (MetricKeyType.isCounterKey(key.keyType) && key.keyType.incremental) {
    return InstrumentType.COUNTER
  }

  return InstrumentType.UP_DOWN_COUNTER
}

const currentHrTime = (): HrTime => {
  const now = Date.now()
  return [Math.floor(now / 1000), (now % 1000) * 1000000]
}

/** @internal */
export const makeProducer = Effect.map(
  Resource.Resource,
  (resource): MetricProducer => new MetricProducerImpl(resource)
)

/** @internal */
export const registerProducer = (self: MetricProducer, metricReader: LazyArg<MetricReader>) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const reader = metricReader()
      reader.setMetricProducer(self)
      return reader
    }),
    (reader) => Effect.promise(() => reader.shutdown())
  )

/** @internal */
export const layer = (evaluate: LazyArg<MetricReader>) =>
  Layer.scopedDiscard(Effect.flatMap(
    makeProducer,
    (producer) => registerProducer(producer, evaluate)
  ))
