import { assert, describe, it } from "@effect/vitest"
import { ValueType } from "@opentelemetry/api"
import { resourceFromAttributes } from "@opentelemetry/resources"
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  InstrumentType,
  PeriodicExportingMetricReader
} from "@opentelemetry/sdk-metrics"
import * as Effect from "effect/Effect"
import * as Metric from "effect/Metric"
import * as internal from "../src/internal/metrics.js"

const findMetric = (metrics: any, name: string) =>
  metrics.resourceMetrics.scopeMetrics[0].metrics.find((_: any) => _.descriptor.name === name)

const makeProducer = () => new internal.MetricProducerImpl(resourceFromAttributes({ name: "test", version: "1.0.0" }))

/** A reader whose exporter reports a single temporality for every instrument type. */
const uniformReader = (temporality: AggregationTemporality) =>
  new PeriodicExportingMetricReader({
    exporter: new InMemoryMetricExporter(temporality),
    exportIntervalMillis: 60_000_000
  })

/**
 * Mirrors the real `DeltaTemporalitySelector` used by `OTLPMetricExporter`: the
 * preference varies *per instrument type* rather than being a single constant.
 */
class DeltaSelectorExporter extends InMemoryMetricExporter {
  constructor() {
    super(AggregationTemporality.DELTA)
  }
  override selectAggregationTemporality(instrumentType: InstrumentType): AggregationTemporality {
    switch (instrumentType) {
      case InstrumentType.COUNTER:
      case InstrumentType.OBSERVABLE_COUNTER:
      case InstrumentType.OBSERVABLE_GAUGE:
      case InstrumentType.HISTOGRAM:
        return AggregationTemporality.DELTA
      default:
        return AggregationTemporality.CUMULATIVE
    }
  }
}

const deltaSelectorReader = () =>
  new PeriodicExportingMetricReader({
    exporter: new DeltaSelectorExporter(),
    exportIntervalMillis: 60_000_000
  })

describe("Metrics", () => {
  it.effect("gauge", () =>
    Effect.gen(function*() {
      const resource = resourceFromAttributes({
        name: "test",
        version: "1.0.0"
      })
      const producer = new internal.MetricProducerImpl(resource)
      const gauge = Metric.gauge("rps")

      yield* Metric.set(gauge, 10).pipe(Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* Metric.set(gauge, 10).pipe(Effect.tagMetrics("key", "value"))
      yield* Metric.set(gauge, 20).pipe(Effect.tagMetrics("key", "value"))

      const results = yield* Effect.promise(() => producer.collect())
      const object = JSON.parse(JSON.stringify(results))
      assert.deepEqual(object.resourceMetrics.resource._rawAttributes, [
        ["name", "test"],
        ["version", "1.0.0"]
      ])
      assert.equal(object.resourceMetrics.scopeMetrics.length, 1)
      const metric = findMetric(object, "rps")
      assert.deepEqual(metric, {
        "dataPointType": 2,
        "descriptor": {
          "advice": {},
          "name": "rps",
          "description": "",
          "unit": "requests",
          "type": "OBSERVABLE_GAUGE",
          "valueType": ValueType.DOUBLE
        },
        "aggregationTemporality": 1,
        "dataPoints": [
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "unit": "requests",
              "key": "value"
            },
            "value": 10
          },
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "key": "value"
            },
            "value": 20
          }
        ]
      })
    }))

  it.effect("gauge bigint", () =>
    Effect.gen(function*() {
      const producer = new internal.MetricProducerImpl(
        resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      const gauge = Metric.gauge("rps-bigint", { bigint: true })

      yield* Metric.set(gauge, 10n).pipe(Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* Metric.set(gauge, 10n).pipe(Effect.tagMetrics("key", "value"))
      yield* Metric.set(gauge, 20n).pipe(Effect.tagMetrics("key", "value"))

      const results = yield* Effect.promise(() => producer.collect())
      const object = JSON.parse(JSON.stringify(results))
      assert.deepEqual(object.resourceMetrics.resource._rawAttributes, [
        ["name", "test"],
        ["version", "1.0.0"]
      ])
      assert.equal(object.resourceMetrics.scopeMetrics.length, 1)
      const metric = findMetric(object, "rps-bigint")
      assert.deepEqual(metric, {
        "dataPointType": 2,
        "descriptor": {
          "advice": {},
          "name": "rps-bigint",
          "description": "",
          "unit": "requests",
          "type": "OBSERVABLE_GAUGE",
          "valueType": ValueType.INT
        },
        "aggregationTemporality": 1,
        "dataPoints": [
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "unit": "requests",
              "key": "value"
            },
            "value": 10
          },
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "key": "value"
            },
            "value": 20
          }
        ]
      })
    }))

  it.effect("counter", () =>
    Effect.gen(function*() {
      const producer = new internal.MetricProducerImpl(
        resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      const counter = Metric.counter("counter", { description: "Example" })

      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"))
      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"))

      const results = yield* Effect.promise(() => producer.collect())
      const object = JSON.parse(JSON.stringify(results))
      assert.deepEqual(object.resourceMetrics.resource._rawAttributes, [
        ["name", "test"],
        ["version", "1.0.0"]
      ])
      assert.equal(object.resourceMetrics.scopeMetrics.length, 1)
      const metric = findMetric(object, "counter")
      assert.deepEqual(metric, {
        "dataPointType": 3,
        "descriptor": {
          "advice": {},
          "name": "counter",
          "description": "Example",
          "unit": "requests",
          "type": "UP_DOWN_COUNTER",
          "valueType": ValueType.DOUBLE
        },
        "isMonotonic": false,
        "aggregationTemporality": 1,
        "dataPoints": [
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "unit": "requests",
              "key": "value"
            },
            "value": 1
          },
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "key": "value"
            },
            "value": 2
          }
        ]
      })
    }))

  it.effect("counter-inc", () =>
    Effect.gen(function*() {
      const producer = new internal.MetricProducerImpl(
        resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      const counter = Metric.counter("counter-inc", {
        description: "Example",
        incremental: true
      })

      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"))
      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"))

      const results = yield* Effect.promise(() => producer.collect())
      const object = JSON.parse(JSON.stringify(results))
      assert.deepEqual(object.resourceMetrics.resource._rawAttributes, [
        ["name", "test"],
        ["version", "1.0.0"]
      ])
      assert.equal(object.resourceMetrics.scopeMetrics.length, 1)
      const metric = findMetric(object, "counter-inc")
      assert.deepEqual(metric, {
        "dataPointType": 3,
        "descriptor": {
          "advice": {},
          "name": "counter-inc",
          "description": "Example",
          "unit": "requests",
          "type": "COUNTER",
          "valueType": ValueType.DOUBLE
        },
        "isMonotonic": true,
        "aggregationTemporality": 1,
        "dataPoints": [
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "unit": "requests",
              "key": "value"
            },
            "value": 1
          },
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "key": "value"
            },
            "value": 2
          }
        ]
      })
    }))

  it.effect("counter-bigint", () =>
    Effect.gen(function*() {
      const producer = new internal.MetricProducerImpl(
        resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      const counter = Metric.counter("counter-bigint", {
        description: "Example",
        incremental: true,
        bigint: true
      })

      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"))
      yield* Metric.increment(counter).pipe(Effect.tagMetrics("key", "value"))

      const results = yield* Effect.promise(() => producer.collect())
      const object = JSON.parse(JSON.stringify(results))
      assert.deepEqual(object.resourceMetrics.resource._rawAttributes, [
        ["name", "test"],
        ["version", "1.0.0"]
      ])
      assert.equal(object.resourceMetrics.scopeMetrics.length, 1)
      const metric = findMetric(object, "counter-bigint")
      assert.deepEqual(metric, {
        "dataPointType": 3,
        "descriptor": {
          "advice": {},
          "name": "counter-bigint",
          "description": "Example",
          "unit": "requests",
          "type": "COUNTER",
          "valueType": ValueType.INT
        },
        "isMonotonic": true,
        "aggregationTemporality": 1,
        "dataPoints": [
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "unit": "requests",
              "key": "value"
            },
            "value": 1
          },
          {
            "startTime": metric.dataPoints[0].startTime,
            "endTime": metric.dataPoints[0].endTime,
            "attributes": {
              "key": "value"
            },
            "value": 2
          }
        ]
      })
    }))

  it.effect("counter honors reader's preferred temporality (DELTA)", () =>
    Effect.gen(function*() {
      const producer = makeProducer()
      yield* internal.registerProducer(producer, () => uniformReader(AggregationTemporality.DELTA))

      const counter = Metric.counter("counter-temp", { incremental: true })
      yield* Metric.increment(counter)
      yield* Metric.increment(counter)

      const results = yield* Effect.promise(() => producer.collect())
      const metric = findMetric(JSON.parse(JSON.stringify(results)), "counter-temp")
      assert.equal(metric.aggregationTemporality, AggregationTemporality.DELTA)
      assert.equal(metric.isMonotonic, true)
    }).pipe(Effect.scoped))

  it.effect("gauge honors reader's preferred temporality (DELTA)", () =>
    Effect.gen(function*() {
      const producer = makeProducer()
      yield* internal.registerProducer(producer, () => uniformReader(AggregationTemporality.DELTA))

      const gauge = Metric.gauge("gauge-temp")
      yield* Metric.set(gauge, 42)

      const results = yield* Effect.promise(() => producer.collect())
      const metric = findMetric(JSON.parse(JSON.stringify(results)), "gauge-temp")
      assert.equal(metric.aggregationTemporality, AggregationTemporality.DELTA)
    }).pipe(Effect.scoped))

  it.effect("falls back to CUMULATIVE when no reader is registered", () =>
    Effect.gen(function*() {
      const producer = makeProducer()
      const counter = Metric.counter("counter-no-reader", { incremental: true })
      yield* Metric.increment(counter)

      const results = yield* Effect.promise(() => producer.collect())
      const metric = findMetric(JSON.parse(JSON.stringify(results)), "counter-no-reader")
      assert.equal(metric.aggregationTemporality, AggregationTemporality.CUMULATIVE)
    }))

  it.effect("temporality is resolved per instrument type, not per metric key", () =>
    Effect.gen(function*() {
      const producer = makeProducer()
      yield* internal.registerProducer(producer, deltaSelectorReader)

      // An `UP_DOWN_COUNTER` -- the delta selector prefers CUMULATIVE for these.
      const upDown = Metric.counter("per-type-updown")
      yield* Metric.incrementBy(upDown, 3)
      // A monotonic `COUNTER` -- the delta selector prefers DELTA.
      const monotonic = Metric.counter("per-type-counter", { incremental: true })
      yield* Metric.increment(monotonic)

      const results = JSON.parse(JSON.stringify(yield* Effect.promise(() => producer.collect())))
      assert.equal(
        findMetric(results, "per-type-updown").aggregationTemporality,
        AggregationTemporality.CUMULATIVE
      )
      assert.equal(
        findMetric(results, "per-type-counter").aggregationTemporality,
        AggregationTemporality.DELTA
      )
    }).pipe(Effect.scoped))

  it.effect("summary _count/_sum use their own COUNTER temporality", () =>
    Effect.gen(function*() {
      const producer = makeProducer()
      yield* internal.registerProducer(producer, deltaSelectorReader)

      const summary = Metric.summary({
        name: "per-type-summary",
        maxAge: "60 seconds",
        maxSize: 10,
        error: 0.01,
        quantiles: [0.5]
      })
      yield* Metric.update(summary, 5)

      const results = JSON.parse(JSON.stringify(yield* Effect.promise(() => producer.collect())))
      // `_count`/`_sum` are emitted as COUNTER descriptors, so they must follow the
      // COUNTER preference (DELTA) rather than the summary's own UP_DOWN_COUNTER.
      assert.equal(
        findMetric(results, "per-type-summary_count").aggregationTemporality,
        AggregationTemporality.DELTA
      )
      assert.equal(
        findMetric(results, "per-type-summary_sum").aggregationTemporality,
        AggregationTemporality.DELTA
      )
      assert.equal(
        findMetric(results, "per-type-summary_quantiles").aggregationTemporality,
        AggregationTemporality.CUMULATIVE
      )
    }).pipe(Effect.scoped))

  it.effect("readers are unregistered when the scope closes", () =>
    Effect.gen(function*() {
      const producer = makeProducer()
      yield* Effect.scoped(
        internal.registerProducer(producer, () => uniformReader(AggregationTemporality.DELTA))
      )
      assert.equal(producer.readers.length, 0)

      const counter = Metric.counter("counter-after-scope", { incremental: true })
      yield* Metric.increment(counter)

      const results = yield* Effect.promise(() => producer.collect())
      const metric = findMetric(JSON.parse(JSON.stringify(results)), "counter-after-scope")
      assert.equal(metric.aggregationTemporality, AggregationTemporality.CUMULATIVE)
    }))
})
