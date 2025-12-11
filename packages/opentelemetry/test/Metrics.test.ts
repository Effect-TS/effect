import { assert, describe, it } from "@effect/vitest"
import { ValueType } from "@opentelemetry/api"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { AggregationTemporality, InstrumentType } from "@opentelemetry/sdk-metrics"
import type { MetricReader } from "@opentelemetry/sdk-metrics"
import * as Effect from "effect/Effect"
import * as Metric from "effect/Metric"
import * as MetricBoundaries from "effect/MetricBoundaries"
import * as internal from "../src/internal/metrics.js"

const findMetric = (metrics: any, name: string) =>
  metrics.resourceMetrics.scopeMetrics[0].metrics.find((_: any) => _.descriptor.name === name)

// Mock MetricReader that returns DELTA temporality
const createDeltaReader = (): MetricReader => ({
  selectAggregationTemporality: (_instrumentType: InstrumentType) => AggregationTemporality.DELTA,
  setMetricProducer: () => {},
  shutdown: () => Promise.resolve(),
  forceFlush: () => Promise.resolve(),
  collect: () => Promise.resolve({ resourceMetrics: { resource: undefined as any, scopeMetrics: [] }, errors: [] })
} as any)

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
})

describe("Metrics - Delta Temporality", () => {
  it.effect("counter with delta temporality", () =>
    Effect.gen(function*() {
      const producer = new internal.MetricProducerImpl(
        resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      // Set up delta reader
      producer.setReaders([createDeltaReader()])

      const counter = Metric.counter("delta-counter", {
        description: "Delta counter example",
        incremental: true
      })

      // First collection: increment counter to 5
      yield* Metric.incrementBy(counter, 5).pipe(Effect.tagMetrics("key", "value"))

      const results1 = yield* Effect.promise(() => producer.collect())
      const metric1 = findMetric(JSON.parse(JSON.stringify(results1)), "delta-counter")

      // First collection should report 5 (delta from 0)
      assert.equal(metric1.aggregationTemporality, AggregationTemporality.DELTA)
      assert.equal(metric1.dataPoints[0].value, 5)

      // Second collection: increment counter by 3 more (total 8)
      yield* Metric.incrementBy(counter, 3).pipe(Effect.tagMetrics("key", "value"))

      const results2 = yield* Effect.promise(() => producer.collect())
      const metric2 = findMetric(JSON.parse(JSON.stringify(results2)), "delta-counter")

      // Second collection should report only the delta (3)
      assert.equal(metric2.aggregationTemporality, AggregationTemporality.DELTA)
      assert.equal(metric2.dataPoints[0].value, 3)
    }))

  it.effect("counter without reader defaults to cumulative", () =>
    Effect.gen(function*() {
      const producer = new internal.MetricProducerImpl(
        resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      // No reader set - should default to cumulative

      const counter = Metric.counter("cumulative-counter", {
        description: "Cumulative counter example",
        incremental: true
      })

      yield* Metric.incrementBy(counter, 5).pipe(Effect.tagMetrics("key", "value"))

      const results1 = yield* Effect.promise(() => producer.collect())
      const metric1 = findMetric(JSON.parse(JSON.stringify(results1)), "cumulative-counter")

      assert.equal(metric1.aggregationTemporality, AggregationTemporality.CUMULATIVE)
      assert.equal(metric1.dataPoints[0].value, 5)

      yield* Metric.incrementBy(counter, 3).pipe(Effect.tagMetrics("key", "value"))

      const results2 = yield* Effect.promise(() => producer.collect())
      const metric2 = findMetric(JSON.parse(JSON.stringify(results2)), "cumulative-counter")

      // Cumulative should still report the total
      assert.equal(metric2.aggregationTemporality, AggregationTemporality.CUMULATIVE)
      assert.equal(metric2.dataPoints[0].value, 8)
    }))

  it.effect("gauge remains cumulative regardless of reader preference", () =>
    Effect.gen(function*() {
      const producer = new internal.MetricProducerImpl(
        resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      // Set up delta reader
      producer.setReaders([createDeltaReader()])

      const gauge = Metric.gauge("delta-gauge")

      yield* Metric.set(gauge, 10).pipe(Effect.tagMetrics("key", "value"))

      const results1 = yield* Effect.promise(() => producer.collect())
      const metric1 = findMetric(JSON.parse(JSON.stringify(results1)), "delta-gauge")

      // Gauges should always be cumulative (point-in-time measurements)
      assert.equal(metric1.aggregationTemporality, AggregationTemporality.CUMULATIVE)
      assert.equal(metric1.dataPoints[0].value, 10)

      yield* Metric.set(gauge, 20).pipe(Effect.tagMetrics("key", "value"))

      const results2 = yield* Effect.promise(() => producer.collect())
      const metric2 = findMetric(JSON.parse(JSON.stringify(results2)), "delta-gauge")

      // Still cumulative, reporting current value
      assert.equal(metric2.aggregationTemporality, AggregationTemporality.CUMULATIVE)
      assert.equal(metric2.dataPoints[0].value, 20)
    }))

  it.effect("histogram with delta temporality", () =>
    Effect.gen(function*() {
      const producer = new internal.MetricProducerImpl(
        resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      // Set up delta reader
      producer.setReaders([createDeltaReader()])

      const boundaries = MetricBoundaries.fromIterable([10, 50, 100])
      const histogram = Metric.histogram("delta-histogram", boundaries, "Delta histogram example")

      // First collection: add values
      yield* Metric.update(histogram, 5).pipe(Effect.tagMetrics("key", "value"))
      yield* Metric.update(histogram, 25).pipe(Effect.tagMetrics("key", "value"))

      const results1 = yield* Effect.promise(() => producer.collect())
      const metric1 = findMetric(JSON.parse(JSON.stringify(results1)), "delta-histogram")

      assert.equal(metric1.aggregationTemporality, AggregationTemporality.DELTA)
      assert.equal(metric1.dataPoints[0].value.count, 2)
      assert.equal(metric1.dataPoints[0].value.sum, 30)

      // Second collection: add more values
      yield* Metric.update(histogram, 75).pipe(Effect.tagMetrics("key", "value"))

      const results2 = yield* Effect.promise(() => producer.collect())
      const metric2 = findMetric(JSON.parse(JSON.stringify(results2)), "delta-histogram")

      // Delta should only report the change
      assert.equal(metric2.aggregationTemporality, AggregationTemporality.DELTA)
      assert.equal(metric2.dataPoints[0].value.count, 1) // Only 1 new observation
      assert.equal(metric2.dataPoints[0].value.sum, 75) // Only the new sum delta
    }))
})
