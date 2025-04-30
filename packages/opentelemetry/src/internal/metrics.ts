import type { HrTime } from "@opentelemetry/api"
import { ValueType } from "@opentelemetry/api"
import type * as Resources from "@opentelemetry/resources"
import type {
  CollectionResult,
  DataPoint,
  Histogram,
  MetricCollectOptions,
  MetricData,
  MetricProducer,
  MetricReader
} from "@opentelemetry/sdk-metrics"
import { AggregationTemporality, DataPointType, InstrumentType } from "@opentelemetry/sdk-metrics"
import type { InstrumentDescriptor } from "@opentelemetry/sdk-metrics/build/src/InstrumentDescriptor.js"
import * as Arr from "effect/Array"
import type { DurationInput } from "effect/Duration"
import * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Metric from "effect/Metric"
import type * as MetricKey from "effect/MetricKey"
import * as MetricKeyType from "effect/MetricKeyType"
import * as MetricState from "effect/MetricState"
import * as Option from "effect/Option"
import * as Resource from "../Resource.js"

const sdkName = "@effect/opentelemetry/Metrics"

type MetricDataWithInstrumentDescriptor = MetricData & {
  readonly descriptor: InstrumentDescriptor
}

/** @internal */
export class MetricProducerImpl implements MetricProducer {
  constructor(readonly resource: Resources.Resource) {}

  startTimes = new Map<string, HrTime>()

  startTimeFor(name: string, hrTime: HrTime) {
    if (this.startTimes.has(name)) {
      return this.startTimes.get(name)!
    }
    this.startTimes.set(name, hrTime)
    return hrTime
  }

  collect(_options?: MetricCollectOptions): Promise<CollectionResult> {
    const snapshot = Metric.unsafeSnapshot()
    const hrTimeNow = currentHrTime()
    const metricData: Array<MetricData> = []
    const metricDataByName = new Map<string, MetricData>()
    const addMetricData = (data: MetricDataWithInstrumentDescriptor) => {
      metricData.push(data)
      metricDataByName.set(data.descriptor.name, data)
    }

    for (let i = 0, len = snapshot.length; i < len; i++) {
      const { metricKey, metricState } = snapshot[i]
      const attributes = Arr.reduce(metricKey.tags, {}, (acc: Record<string, string>, label) => {
        acc[label.key] = label.value
        return acc
      })
      const descriptor = descriptorFromKey(metricKey, attributes)
      const startTime = this.startTimeFor(descriptor.name, hrTimeNow)

      if (MetricState.isCounterState(metricState)) {
        const dataPoint: DataPoint<number> = {
          startTime,
          endTime: hrTimeNow,
          attributes,
          value: Number(metricState.count)
        }
        if (metricDataByName.has(descriptor.name)) {
          metricDataByName.get(descriptor.name)!.dataPoints.push(dataPoint as any)
        } else {
          addMetricData({
            dataPointType: DataPointType.SUM,
            descriptor,
            isMonotonic: descriptor.type === InstrumentType.COUNTER,
            aggregationTemporality: AggregationTemporality.CUMULATIVE,
            dataPoints: [dataPoint]
          })
        }
      } else if (MetricState.isGaugeState(metricState)) {
        const dataPoint: DataPoint<number> = {
          startTime,
          endTime: hrTimeNow,
          attributes,
          value: Number(metricState.value)
        }
        if (metricDataByName.has(descriptor.name)) {
          metricDataByName.get(descriptor.name)!.dataPoints.push(dataPoint as any)
        } else {
          addMetricData({
            dataPointType: DataPointType.GAUGE,
            descriptor,
            aggregationTemporality: AggregationTemporality.CUMULATIVE,
            dataPoints: [dataPoint]
          })
        }
      } else if (MetricState.isHistogramState(metricState)) {
        const size = metricState.buckets.length
        const buckets = {
          boundaries: Arr.allocate(size - 1) as Array<number>,
          counts: Arr.allocate(size) as Array<number>
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
        const dataPoint: DataPoint<Histogram> = {
          startTime,
          endTime: hrTimeNow,
          attributes,
          value: {
            buckets,
            count: metricState.count,
            min: metricState.min,
            max: metricState.max,
            sum: metricState.sum
          }
        }

        if (metricDataByName.has(descriptor.name)) {
          metricDataByName.get(descriptor.name)!.dataPoints.push(dataPoint as any)
        } else {
          addMetricData({
            dataPointType: DataPointType.HISTOGRAM,
            descriptor,
            aggregationTemporality: AggregationTemporality.CUMULATIVE,
            dataPoints: [dataPoint]
          })
        }
      } else if (MetricState.isFrequencyState(metricState)) {
        const dataPoints: Array<DataPoint<number>> = []
        for (const [freqKey, value] of metricState.occurrences) {
          dataPoints.push({
            startTime,
            endTime: hrTimeNow,
            attributes: {
              ...attributes,
              key: freqKey
            },
            value
          })
        }
        if (metricDataByName.has(descriptor.name)) {
          // eslint-disable-next-line no-restricted-syntax
          metricDataByName.get(descriptor.name)!.dataPoints.push(...dataPoints as any)
        } else {
          addMetricData({
            dataPointType: DataPointType.SUM,
            descriptor: descriptorFromKey(metricKey, attributes),
            aggregationTemporality: AggregationTemporality.CUMULATIVE,
            isMonotonic: true,
            dataPoints
          })
        }
      } else if (MetricState.isSummaryState(metricState)) {
        const dataPoints: Array<DataPoint<number>> = [{
          startTime,
          endTime: hrTimeNow,
          attributes: { ...attributes, quantile: "min" },
          value: metricState.min
        }]
        for (const [quantile, value] of metricState.quantiles) {
          dataPoints.push({
            startTime,
            endTime: hrTimeNow,
            attributes: { ...attributes, quantile: quantile.toString() },
            value: value._tag === "Some" ? value.value : 0
          })
        }
        dataPoints.push({
          startTime,
          endTime: hrTimeNow,
          attributes: { ...attributes, quantile: "max" },
          value: metricState.max
        })
        const countDataPoint: DataPoint<number> = {
          startTime,
          endTime: hrTimeNow,
          attributes,
          value: metricState.count
        }
        const sumDataPoint: DataPoint<number> = {
          startTime,
          endTime: hrTimeNow,
          attributes,
          value: metricState.sum
        }

        if (metricDataByName.has(`${descriptor.name}_quantiles`)) {
          // eslint-disable-next-line no-restricted-syntax
          metricDataByName.get(`${descriptor.name}_quantiles`)!.dataPoints.push(...dataPoints as any)
          metricDataByName.get(`${descriptor.name}_count`)!.dataPoints.push(countDataPoint as any)
          metricDataByName.get(`${descriptor.name}_sum`)!.dataPoints.push(sumDataPoint as any)
        } else {
          addMetricData({
            dataPointType: DataPointType.SUM,
            descriptor: descriptorFromKey(metricKey, attributes, "quantiles"),
            aggregationTemporality: AggregationTemporality.CUMULATIVE,
            isMonotonic: false,
            dataPoints
          })
          addMetricData({
            dataPointType: DataPointType.SUM,
            descriptor: {
              ...descriptorMeta(metricKey, "count"),
              unit: "1",
              type: InstrumentType.COUNTER,
              valueType: ValueType.INT
            },
            aggregationTemporality: AggregationTemporality.CUMULATIVE,
            isMonotonic: true,
            dataPoints: [countDataPoint]
          })
          addMetricData({
            dataPointType: DataPointType.SUM,
            descriptor: {
              ...descriptorMeta(metricKey, "sum"),
              unit: "1",
              type: InstrumentType.COUNTER,
              valueType: ValueType.DOUBLE
            },
            aggregationTemporality: AggregationTemporality.CUMULATIVE,
            isMonotonic: true,
            dataPoints: [sumDataPoint]
          })
        }
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
  description: Option.getOrElse(metricKey.description, () => ""),
  advice: {}
})

const descriptorFromKey = (
  metricKey: MetricKey.MetricKey.Untyped,
  tags: Record<string, string>,
  suffix?: string
): InstrumentDescriptor => ({
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
export const registerProducer = (
  self: MetricProducer,
  metricReader: LazyArg<MetricReader | Arr.NonEmptyReadonlyArray<MetricReader>>,
  options?: {
    readonly shutdownTimeout?: DurationInput | undefined
  }
) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const reader = metricReader()
      const readers: Array<MetricReader> = Array.isArray(reader) ? reader : [reader] as any
      readers.forEach((reader) => reader.setMetricProducer(self))
      return readers
    }),
    (readers) =>
      Effect.promise(() =>
        Promise.all(
          readers.map((reader) => reader.shutdown())
        )
      ).pipe(
        Effect.ignoreLogged,
        Effect.interruptible,
        Effect.timeoutOption(options?.shutdownTimeout ?? 3000)
      )
  )

/** @internal */
export const layer = (evaluate: LazyArg<MetricReader | Arr.NonEmptyReadonlyArray<MetricReader>>, options?: {
  readonly shutdownTimeout?: DurationInput | undefined
}) =>
  Layer.scopedDiscard(Effect.flatMap(
    makeProducer,
    (producer) => registerProducer(producer, evaluate, options)
  ))
