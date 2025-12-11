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
export type PreviousCounterState = {
  readonly count: number
}

/** @internal */
export type PreviousHistogramState = {
  readonly count: number
  readonly sum: number
  readonly buckets: ReadonlyArray<number>
}

/** @internal */
export type PreviousFrequencyState = {
  readonly occurrences: ReadonlyMap<string, number>
}

/** @internal */
export type PreviousSummaryState = {
  readonly count: number
  readonly sum: number
}

/** @internal */
export type PreviousMetricState = {
  readonly counter?: PreviousCounterState
  readonly histogram?: PreviousHistogramState
  readonly frequency?: PreviousFrequencyState
  readonly summary?: PreviousSummaryState
}

/** @internal */
export class MetricProducerImpl implements MetricProducer {
  constructor(readonly resource: Resources.Resource) {}

  readers: Array<MetricReader> = []
  startTimes = new Map<string, HrTime>()
  previousValues = new Map<string, PreviousMetricState>()
  lastCollectionTime: HrTime | null = null

  setReaders(readers: Array<MetricReader>) {
    this.readers = readers
  }

  startTimeFor(name: string, hrTime: HrTime) {
    if (this.startTimes.has(name)) {
      return this.startTimes.get(name)!
    }
    this.startTimes.set(name, hrTime)
    return hrTime
  }

  getTemporality(instrumentType: InstrumentType): AggregationTemporality {
    if (this.readers.length > 0) {
      return this.readers[0].selectAggregationTemporality(instrumentType)
    }
    return AggregationTemporality.CUMULATIVE
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
        const temporality = this.getTemporality(descriptor.type)

        let value = Number(metricState.count)
        let effectiveStartTime = startTime

        if (temporality === AggregationTemporality.DELTA) {
          const key = `counter:${descriptor.name}:${JSON.stringify(attributes)}`
          const prev = this.previousValues.get(key)?.counter?.count ?? 0
          value = Number(metricState.count) - prev
          this.previousValues.set(key, {
            ...this.previousValues.get(key),
            counter: { count: Number(metricState.count) }
          })
          effectiveStartTime = this.lastCollectionTime ?? hrTimeNow
        }

        const dataPoint: DataPoint<number> = {
          startTime: effectiveStartTime,
          endTime: hrTimeNow,
          attributes,
          value
        }
        if (metricDataByName.has(descriptor.name)) {
          metricDataByName.get(descriptor.name)!.dataPoints.push(dataPoint as any)
        } else {
          addMetricData({
            dataPointType: DataPointType.SUM,
            descriptor,
            isMonotonic: descriptor.type === InstrumentType.COUNTER,
            aggregationTemporality: temporality,
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
        const temporality = this.getTemporality(descriptor.type)

        const size = metricState.buckets.length
        const buckets = {
          boundaries: Arr.allocate(size - 1) as Array<number>,
          counts: Arr.allocate(size) as Array<number>
        }

        // Build cumulative bucket counts (converting from Effect's cumulative format to per-bucket)
        const cumulativeBucketCounts: Array<number> = []
        let idx = 0
        let prev = 0
        for (const [boundary, value] of metricState.buckets) {
          if (idx < size - 1) {
            buckets.boundaries[idx] = boundary
          }
          const perBucketCount = value - prev
          cumulativeBucketCounts.push(value)
          buckets.counts[idx] = perBucketCount
          prev = value
          idx++
        }

        let count = metricState.count
        let sum = metricState.sum
        let effectiveStartTime = startTime

        if (temporality === AggregationTemporality.DELTA) {
          const key = `histogram:${descriptor.name}:${JSON.stringify(attributes)}`
          const prevState = this.previousValues.get(key)?.histogram
          if (prevState) {
            count = metricState.count - prevState.count
            sum = metricState.sum - prevState.sum
            // Compute delta for each bucket
            for (let j = 0; j < buckets.counts.length; j++) {
              const prevBucketCumulative = prevState.buckets[j] ?? 0
              const currentBucketCumulative = cumulativeBucketCounts[j] ?? 0
              const prevPrevBucketCumulative = j > 0 ? (prevState.buckets[j - 1] ?? 0) : 0
              const currentPrevBucketCumulative = j > 0 ? (cumulativeBucketCounts[j - 1] ?? 0) : 0
              const prevPerBucket = prevBucketCumulative - prevPrevBucketCumulative
              const currentPerBucket = currentBucketCumulative - currentPrevBucketCumulative
              buckets.counts[j] = currentPerBucket - prevPerBucket
            }
          }
          this.previousValues.set(key, {
            ...this.previousValues.get(key),
            histogram: {
              count: metricState.count,
              sum: metricState.sum,
              buckets: cumulativeBucketCounts
            }
          })
          effectiveStartTime = this.lastCollectionTime ?? hrTimeNow
        }

        const dataPoint: DataPoint<Histogram> = {
          startTime: effectiveStartTime,
          endTime: hrTimeNow,
          attributes,
          value: {
            buckets,
            count,
            min: metricState.min,
            max: metricState.max,
            sum
          }
        }

        if (metricDataByName.has(descriptor.name)) {
          metricDataByName.get(descriptor.name)!.dataPoints.push(dataPoint as any)
        } else {
          addMetricData({
            dataPointType: DataPointType.HISTOGRAM,
            descriptor,
            aggregationTemporality: temporality,
            dataPoints: [dataPoint]
          })
        }
      } else if (MetricState.isFrequencyState(metricState)) {
        const temporality = this.getTemporality(descriptor.type)
        const key = `frequency:${descriptor.name}:${JSON.stringify(attributes)}`

        const dataPoints: Array<DataPoint<number>> = []
        const currentOccurrences = new Map<string, number>()
        let effectiveStartTime = startTime

        if (temporality === AggregationTemporality.DELTA) {
          effectiveStartTime = this.lastCollectionTime ?? hrTimeNow
        }

        for (const [freqKey, value] of metricState.occurrences) {
          currentOccurrences.set(freqKey, value)
          let deltaValue = value

          if (temporality === AggregationTemporality.DELTA) {
            const prevOccurrences = this.previousValues.get(key)?.frequency?.occurrences
            const prevValue = prevOccurrences?.get(freqKey) ?? 0
            deltaValue = value - prevValue
          }

          dataPoints.push({
            startTime: effectiveStartTime,
            endTime: hrTimeNow,
            attributes: {
              ...attributes,
              key: freqKey
            },
            value: deltaValue
          })
        }

        if (temporality === AggregationTemporality.DELTA) {
          this.previousValues.set(key, {
            ...this.previousValues.get(key),
            frequency: { occurrences: currentOccurrences }
          })
        }

        if (metricDataByName.has(descriptor.name)) {
          // eslint-disable-next-line no-restricted-syntax
          metricDataByName.get(descriptor.name)!.dataPoints.push(...dataPoints as any)
        } else {
          addMetricData({
            dataPointType: DataPointType.SUM,
            descriptor: descriptorFromKey(metricKey, attributes),
            aggregationTemporality: temporality,
            isMonotonic: true,
            dataPoints
          })
        }
      } else if (MetricState.isSummaryState(metricState)) {
        // For summary, count and sum support delta, but quantiles are point-in-time (gauge-like)
        const temporality = this.getTemporality(InstrumentType.COUNTER)
        const key = `summary:${descriptor.name}:${JSON.stringify(attributes)}`

        let effectiveStartTime = startTime
        let countValue = metricState.count
        let sumValue = metricState.sum

        if (temporality === AggregationTemporality.DELTA) {
          const prevState = this.previousValues.get(key)?.summary
          if (prevState) {
            countValue = metricState.count - prevState.count
            sumValue = metricState.sum - prevState.sum
          }
          this.previousValues.set(key, {
            ...this.previousValues.get(key),
            summary: { count: metricState.count, sum: metricState.sum }
          })
          effectiveStartTime = this.lastCollectionTime ?? hrTimeNow
        }

        // Quantiles remain point-in-time (cumulative)
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
          startTime: effectiveStartTime,
          endTime: hrTimeNow,
          attributes,
          value: countValue
        }
        const sumDataPoint: DataPoint<number> = {
          startTime: effectiveStartTime,
          endTime: hrTimeNow,
          attributes,
          value: sumValue
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
            aggregationTemporality: temporality,
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
            aggregationTemporality: temporality,
            isMonotonic: true,
            dataPoints: [sumDataPoint]
          })
        }
      }
    }

    // Track collection time for delta temporality
    this.lastCollectionTime = hrTimeNow

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
      // Pass readers back to producer for temporality queries
      if (self instanceof MetricProducerImpl) {
        self.setReaders(readers)
      }
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
