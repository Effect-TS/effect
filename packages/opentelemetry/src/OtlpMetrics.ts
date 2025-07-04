/**
 * @since 1.0.0
 */
import type * as Headers from "@effect/platform/Headers"
import type * as HttpClient from "@effect/platform/HttpClient"
import * as Arr from "effect/Array"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Metric from "effect/Metric"
import type * as MetricKey from "effect/MetricKey"
import * as MetricState from "effect/MetricState"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import * as Exporter from "./internal/otlpExporter.js"
import type { Fixed64, KeyValue } from "./OtlpResource.js"
import * as OtlpResource from "./OtlpResource.js"

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make: (options: {
  readonly url: string
  readonly resource?: {
    readonly serviceName?: string | undefined
    readonly serviceVersion?: string | undefined
    readonly attributes?: Record<string, unknown>
  } | undefined
  readonly headers?: Headers.Input | undefined
  readonly exportInterval?: Duration.DurationInput | undefined
  readonly shutdownTimeout?: Duration.DurationInput | undefined
}) => Effect.Effect<
  void,
  never,
  HttpClient.HttpClient | Scope.Scope
> = Effect.fnUntraced(function*(options) {
  const clock = yield* Effect.clock
  const startTime = String(clock.unsafeCurrentTimeNanos())

  const resource = yield* OtlpResource.fromConfig(options.resource)
  const metricsScope: IInstrumentationScope = {
    name: OtlpResource.unsafeServiceName(resource)
  }

  const snapshot = (): IExportMetricsServiceRequest => {
    const snapshot = Metric.unsafeSnapshot()
    const nowNanos = clock.unsafeCurrentTimeNanos()
    const nowTime = String(nowNanos)
    const metricData: Array<IMetric> = []
    const metricDataByName = new Map<string, IMetric>()
    const addMetricData = (data: IMetric) => {
      metricData.push(data)
      metricDataByName.set(data.name, data)
    }

    for (let i = 0, len = snapshot.length; i < len; i++) {
      const { metricKey, metricState } = snapshot[i]
      let unit = "1"
      const attributes = Arr.reduce(metricKey.tags, [], (acc: Array<KeyValue>, label) => {
        if (label.key === "unit" || label.key === "time_unit") {
          unit = label.value
        }
        acc.push({ key: label.key, value: { stringValue: label.value } })
        return acc
      })

      if (MetricState.isCounterState(metricState)) {
        const dataPoint: INumberDataPoint = {
          attributes,
          startTimeUnixNano: startTime,
          timeUnixNano: nowTime
        }
        if (typeof metricState.count === "bigint") {
          dataPoint.asInt = Number(metricState.count)
        } else {
          dataPoint.asDouble = metricState.count
        }
        if (metricDataByName.has(metricKey.name)) {
          metricDataByName.get(metricKey.name)!.sum!.dataPoints.push(dataPoint)
        } else {
          const key = metricKey as MetricKey.MetricKey.Counter<any>
          addMetricData({
            name: metricKey.name,
            description: getOrEmpty(key.description),
            unit,
            sum: {
              aggregationTemporality: EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE,
              isMonotonic: key.keyType.incremental,
              dataPoints: [dataPoint]
            }
          })
        }
      } else if (MetricState.isGaugeState(metricState)) {
        const dataPoint: INumberDataPoint = {
          attributes,
          startTimeUnixNano: startTime,
          timeUnixNano: nowTime
        }
        if (typeof metricState.value === "bigint") {
          dataPoint.asInt = Number(metricState.value)
        } else {
          dataPoint.asDouble = metricState.value
        }
        if (metricDataByName.has(metricKey.name)) {
          metricDataByName.get(metricKey.name)!.gauge!.dataPoints.push(dataPoint)
        } else {
          addMetricData({
            name: metricKey.name,
            description: getOrEmpty(metricKey.description),
            unit,
            gauge: {
              dataPoints: [dataPoint]
            }
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
        const dataPoint: IHistogramDataPoint = {
          attributes,
          startTimeUnixNano: startTime,
          timeUnixNano: nowTime,
          count: metricState.count,
          min: metricState.min,
          max: metricState.max,
          sum: metricState.sum,
          bucketCounts: buckets.counts,
          explicitBounds: buckets.boundaries
        }

        if (metricDataByName.has(metricKey.name)) {
          metricDataByName.get(metricKey.name)!.histogram!.dataPoints.push(dataPoint)
        } else {
          addMetricData({
            name: metricKey.name,
            description: getOrEmpty(metricKey.description),
            unit,
            histogram: {
              aggregationTemporality: EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE,
              dataPoints: [dataPoint]
            }
          })
        }
      } else if (MetricState.isFrequencyState(metricState)) {
        const dataPoints: Array<INumberDataPoint> = []
        for (const [freqKey, value] of metricState.occurrences) {
          dataPoints.push({
            attributes: [...attributes, { key: "key", value: { stringValue: freqKey } }],
            startTimeUnixNano: startTime,
            timeUnixNano: nowTime,
            asInt: value
          })
        }
        if (metricDataByName.has(metricKey.name)) {
          // eslint-disable-next-line no-restricted-syntax
          metricDataByName.get(metricKey.name)!.sum!.dataPoints.push(...dataPoints)
        } else {
          addMetricData({
            name: metricKey.name,
            description: getOrEmpty(metricKey.description),
            unit,
            sum: {
              aggregationTemporality: EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE,
              isMonotonic: true,
              dataPoints
            }
          })
        }
      } else if (MetricState.isSummaryState(metricState)) {
        const dataPoints: Array<INumberDataPoint> = [{
          attributes: [...attributes, { key: "quantile", value: { stringValue: "min" } }],
          startTimeUnixNano: startTime,
          timeUnixNano: nowTime,
          asDouble: metricState.min
        }]
        for (const [quantile, value] of metricState.quantiles) {
          dataPoints.push({
            attributes: [...attributes, { key: "quantile", value: { stringValue: quantile.toString() } }],
            startTimeUnixNano: startTime,
            timeUnixNano: nowTime,
            asDouble: value._tag === "Some" ? value.value : 0
          })
        }
        dataPoints.push({
          attributes: [...attributes, { key: "quantile", value: { stringValue: "max" } }],
          startTimeUnixNano: startTime,
          timeUnixNano: nowTime,
          asDouble: metricState.max
        })
        const countDataPoint: INumberDataPoint = {
          attributes,
          startTimeUnixNano: startTime,
          timeUnixNano: nowTime,
          asInt: metricState.count
        }
        const sumDataPoint: INumberDataPoint = {
          attributes,
          startTimeUnixNano: startTime,
          timeUnixNano: nowTime,
          asDouble: metricState.sum
        }

        if (metricDataByName.has(`${metricKey.name}_quantiles`)) {
          // eslint-disable-next-line no-restricted-syntax
          metricDataByName.get(`${metricKey.name}_quantiles`)!.sum!.dataPoints.push(...dataPoints)
          metricDataByName.get(`${metricKey.name}_count`)!.sum!.dataPoints.push(countDataPoint)
          metricDataByName.get(`${metricKey.name}_sum`)!.sum!.dataPoints.push(sumDataPoint)
        } else {
          addMetricData({
            name: `${metricKey.name}_quantiles`,
            description: getOrEmpty(metricKey.description),
            unit,
            sum: {
              aggregationTemporality: EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE,
              isMonotonic: false,
              dataPoints
            }
          })
          addMetricData({
            name: `${metricKey.name}_count`,
            description: getOrEmpty(metricKey.description),
            unit: "1",
            sum: {
              aggregationTemporality: EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE,
              isMonotonic: true,
              dataPoints: [countDataPoint]
            }
          })
          addMetricData({
            name: `${metricKey.name}_sum`,
            description: getOrEmpty(metricKey.description),
            unit: "1",
            sum: {
              aggregationTemporality: EAggregationTemporality.AGGREGATION_TEMPORALITY_CUMULATIVE,
              isMonotonic: true,
              dataPoints: [sumDataPoint]
            }
          })
        }
      }
    }

    return {
      resourceMetrics: [{
        resource,
        scopeMetrics: [{
          scope: metricsScope,
          metrics: metricData
        }]
      }]
    }
  }

  yield* Exporter.make({
    label: "OtlpMetrics",
    url: options.url,
    headers: options.headers,
    maxBatchSize: "disabled",
    exportInterval: options.exportInterval ?? Duration.seconds(10),
    body: snapshot,
    shutdownTimeout: options.shutdownTimeout ?? Duration.seconds(3)
  })
})

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly url: string
  readonly resource?: {
    readonly serviceName?: string | undefined
    readonly serviceVersion?: string | undefined
    readonly attributes?: Record<string, unknown>
  } | undefined
  readonly headers?: Headers.Input | undefined
  readonly exportInterval?: Duration.DurationInput | undefined
  readonly shutdownTimeout?: Duration.DurationInput | undefined
}): Layer.Layer<never, never, HttpClient.HttpClient> => Layer.scopedDiscard(make(options))

// internal

const getOrEmpty = Option.getOrElse(() => "")

/** Properties of an InstrumentationScope. */
interface IInstrumentationScope {
  /** InstrumentationScope name */
  name: string
  /** InstrumentationScope version */
  version?: string
  /** InstrumentationScope attributes */
  attributes?: Array<KeyValue>
  /** InstrumentationScope droppedAttributesCount */
  droppedAttributesCount?: number
}

/** Properties of an ExportMetricsServiceRequest. */
interface IExportMetricsServiceRequest {
  /** ExportMetricsServiceRequest resourceMetrics */
  resourceMetrics: Array<IResourceMetrics>
}
/** Properties of a ResourceMetrics. */
interface IResourceMetrics {
  /** ResourceMetrics resource */
  resource?: OtlpResource.Resource
  /** ResourceMetrics scopeMetrics */
  scopeMetrics: Array<IScopeMetrics>
  /** ResourceMetrics schemaUrl */
  schemaUrl?: string
}
/** Properties of an IScopeMetrics. */
interface IScopeMetrics {
  /** ScopeMetrics scope */
  scope?: IInstrumentationScope
  /** ScopeMetrics metrics */
  metrics: Array<IMetric>
  /** ScopeMetrics schemaUrl */
  schemaUrl?: string
}
/** Properties of a Metric. */
interface IMetric {
  /** Metric name */
  name: string
  /** Metric description */
  description?: string
  /** Metric unit */
  unit?: string
  /** Metric gauge */
  gauge?: IGauge
  /** Metric sum */
  sum?: ISum
  /** Metric histogram */
  histogram?: IHistogram
  /** Metric exponentialHistogram */
  exponentialHistogram?: IExponentialHistogram
  /** Metric summary */
  summary?: ISummary
}
/** Properties of a Gauge. */
interface IGauge {
  /** Gauge dataPoints */
  dataPoints: Array<INumberDataPoint>
}
/** Properties of a Sum. */
interface ISum {
  /** Sum dataPoints */
  dataPoints: Array<INumberDataPoint>
  /** Sum aggregationTemporality */
  aggregationTemporality: EAggregationTemporality
  /** Sum isMonotonic */
  isMonotonic: boolean
}
/** Properties of a Histogram. */
interface IHistogram {
  /** Histogram dataPoints */
  dataPoints: Array<IHistogramDataPoint>
  /** Histogram aggregationTemporality */
  aggregationTemporality?: EAggregationTemporality
}
/** Properties of an ExponentialHistogram. */
interface IExponentialHistogram {
  /** ExponentialHistogram dataPoints */
  dataPoints: Array<IExponentialHistogramDataPoint>
  /** ExponentialHistogram aggregationTemporality */
  aggregationTemporality?: EAggregationTemporality
}
/** Properties of a Summary. */
interface ISummary {
  /** Summary dataPoints */
  dataPoints: Array<ISummaryDataPoint>
}
/** Properties of a NumberDataPoint. */
interface INumberDataPoint {
  /** NumberDataPoint attributes */
  attributes: Array<KeyValue>
  /** NumberDataPoint startTimeUnixNano */
  startTimeUnixNano?: Fixed64
  /** NumberDataPoint timeUnixNano */
  timeUnixNano?: Fixed64
  /** NumberDataPoint asDouble */
  asDouble?: number | null
  /** NumberDataPoint asInt */
  asInt?: number
  /** NumberDataPoint exemplars */
  exemplars?: Array<IExemplar>
  /** NumberDataPoint flags */
  flags?: number
}
/** Properties of a HistogramDataPoint. */
interface IHistogramDataPoint {
  /** HistogramDataPoint attributes */
  attributes?: Array<KeyValue>
  /** HistogramDataPoint startTimeUnixNano */
  startTimeUnixNano?: Fixed64
  /** HistogramDataPoint timeUnixNano */
  timeUnixNano?: Fixed64
  /** HistogramDataPoint count */
  count?: number
  /** HistogramDataPoint sum */
  sum?: number
  /** HistogramDataPoint bucketCounts */
  bucketCounts?: Array<number>
  /** HistogramDataPoint explicitBounds */
  explicitBounds?: Array<number>
  /** HistogramDataPoint exemplars */
  exemplars?: Array<IExemplar>
  /** HistogramDataPoint flags */
  flags?: number
  /** HistogramDataPoint min */
  min?: number
  /** HistogramDataPoint max */
  max?: number
}
/** Properties of an ExponentialHistogramDataPoint. */
interface IExponentialHistogramDataPoint {
  /** ExponentialHistogramDataPoint attributes */
  attributes?: Array<KeyValue>
  /** ExponentialHistogramDataPoint startTimeUnixNano */
  startTimeUnixNano?: Fixed64
  /** ExponentialHistogramDataPoint timeUnixNano */
  timeUnixNano?: Fixed64
  /** ExponentialHistogramDataPoint count */
  count?: number
  /** ExponentialHistogramDataPoint sum */
  sum?: number
  /** ExponentialHistogramDataPoint scale */
  scale?: number
  /** ExponentialHistogramDataPoint zeroCount */
  zeroCount?: number
  /** ExponentialHistogramDataPoint positive */
  positive?: IBuckets
  /** ExponentialHistogramDataPoint negative */
  negative?: IBuckets
  /** ExponentialHistogramDataPoint flags */
  flags?: number
  /** ExponentialHistogramDataPoint exemplars */
  exemplars?: Array<IExemplar>
  /** ExponentialHistogramDataPoint min */
  min?: number
  /** ExponentialHistogramDataPoint max */
  max?: number
}
/** Properties of a SummaryDataPoint. */
interface ISummaryDataPoint {
  /** SummaryDataPoint attributes */
  attributes?: Array<KeyValue>
  /** SummaryDataPoint startTimeUnixNano */
  startTimeUnixNano?: number
  /** SummaryDataPoint timeUnixNano */
  timeUnixNano?: string
  /** SummaryDataPoint count */
  count?: number
  /** SummaryDataPoint sum */
  sum?: number
  /** SummaryDataPoint quantileValues */
  quantileValues?: Array<IValueAtQuantile>
  /** SummaryDataPoint flags */
  flags?: number
}
/** Properties of a ValueAtQuantile. */
interface IValueAtQuantile {
  /** ValueAtQuantile quantile */
  quantile?: number
  /** ValueAtQuantile value */
  value?: number
}
/** Properties of a Buckets. */
interface IBuckets {
  /** Buckets offset */
  offset?: number
  /** Buckets bucketCounts */
  bucketCounts?: Array<number>
}
/** Properties of an Exemplar. */
interface IExemplar {
  /** Exemplar filteredAttributes */
  filteredAttributes?: Array<KeyValue>
  /** Exemplar timeUnixNano */
  timeUnixNano?: string
  /** Exemplar asDouble */
  asDouble?: number
  /** Exemplar asInt */
  asInt?: number
  /** Exemplar spanId */
  spanId?: string | Uint8Array
  /** Exemplar traceId */
  traceId?: string | Uint8Array
}
/**
 * AggregationTemporality defines how a metric aggregator reports aggregated
 * values. It describes how those values relate to the time interval over
 * which they are aggregated.
 */
const enum EAggregationTemporality {
  AGGREGATION_TEMPORALITY_UNSPECIFIED = 0,
  /** DELTA is an AggregationTemporality for a metric aggregator which reports
    changes since last report time. Successive metrics contain aggregation of
    values from continuous and non-overlapping intervals.

    The values for a DELTA metric are based only on the time interval
    associated with one measurement cycle. There is no dependency on
    previous measurements like is the case for CUMULATIVE metrics.

    For example, consider a system measuring the number of requests that
    it receives and reports the sum of these requests every second as a
    DELTA metric:

    1. The system starts receiving at time=t_0.
    2. A request is received, the system measures 1 request.
    3. A request is received, the system measures 1 request.
    4. A request is received, the system measures 1 request.
    5. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_0 to
        t_0+1 with a value of 3.
    6. A request is received, the system measures 1 request.
    7. A request is received, the system measures 1 request.
    8. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_0+1 to
        t_0+2 with a value of 2. */
  AGGREGATION_TEMPORALITY_DELTA = 1,
  /** CUMULATIVE is an AggregationTemporality for a metric aggregator which
    reports changes since a fixed start time. This means that current values
    of a CUMULATIVE metric depend on all previous measurements since the
    start time. Because of this, the sender is required to retain this state
    in some form. If this state is lost or invalidated, the CUMULATIVE metric
    values MUST be reset and a new fixed start time following the last
    reported measurement time sent MUST be used.

    For example, consider a system measuring the number of requests that
    it receives and reports the sum of these requests every second as a
    CUMULATIVE metric:

    1. The system starts receiving at time=t_0.
    2. A request is received, the system measures 1 request.
    3. A request is received, the system measures 1 request.
    4. A request is received, the system measures 1 request.
    5. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_0 to
        t_0+1 with a value of 3.
    6. A request is received, the system measures 1 request.
    7. A request is received, the system measures 1 request.
    8. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_0 to
        t_0+2 with a value of 5.
    9. The system experiences a fault and loses state.
    10. The system recovers and resumes receiving at time=t_1.
    11. A request is received, the system measures 1 request.
    12. The 1 second collection cycle ends. A metric is exported for the
        number of requests received over the interval of time t_1 to
        t_0+1 with a value of 1.

    Note: Even though, when reporting changes since last report time, using
    CUMULATIVE is valid, it is not recommended. This may cause problems for
    systems that do not use start_time to determine when the aggregation
    value was reset (e.g. Prometheus). */
  AGGREGATION_TEMPORALITY_CUMULATIVE = 2
}
