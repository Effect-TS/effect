import * as internal from "@effect/opentelemetry/internal/metrics"
import { assert, describe, it } from "@effect/vitest"
import { ValueType } from "@opentelemetry/api"
import * as Resources from "@opentelemetry/resources"
import * as Effect from "effect/Effect"
import * as Metric from "effect/Metric"

const findMetric = (metrics: any, name: string) =>
  metrics.resourceMetrics.scopeMetrics[0].metrics.find((_: any) => _.descriptor.name === name)

describe("Metrics", () => {
  it.effect("gauge", () =>
    Effect.gen(function*(_) {
      const resource = Resources.resourceFromAttributes({
        name: "test",
        version: "1.0.0"
      })
      const producer = new internal.MetricProducerImpl(resource)
      const gauge = Metric.gauge("rps")

      yield* _(Metric.set(gauge, 10), Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* _(Metric.set(gauge, 10), Effect.tagMetrics("key", "value"))
      yield* _(Metric.set(gauge, 20), Effect.tagMetrics("key", "value"))

      const results = yield* _(Effect.promise(() => producer.collect()))
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
          "name": "rps",
          "description": "",
          "unit": "requests",
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
    Effect.gen(function*(_) {
      const producer = new internal.MetricProducerImpl(
        Resources.resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      const gauge = Metric.gauge("rps-bigint", { bigint: true })

      yield* _(Metric.set(gauge, 10n), Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* _(Metric.set(gauge, 10n), Effect.tagMetrics("key", "value"))
      yield* _(Metric.set(gauge, 20n), Effect.tagMetrics("key", "value"))

      const results = yield* _(Effect.promise(() => producer.collect()))
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
          "name": "rps-bigint",
          "description": "",
          "unit": "requests",
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
    Effect.gen(function*(_) {
      const producer = new internal.MetricProducerImpl(
        Resources.resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      const counter = Metric.counter("counter", { description: "Example" })

      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"))
      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"))

      const results = yield* _(Effect.promise(() => producer.collect()))
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
          "name": "counter",
          "description": "Example",
          "unit": "requests",
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
    Effect.gen(function*(_) {
      const producer = new internal.MetricProducerImpl(
        Resources.resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      const counter = Metric.counter("counter-inc", {
        description: "Example",
        incremental: true
      })

      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"))
      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"))

      const results = yield* _(Effect.promise(() => producer.collect()))
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
          "name": "counter-inc",
          "description": "Example",
          "unit": "requests",
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
    Effect.gen(function*(_) {
      const producer = new internal.MetricProducerImpl(
        Resources.resourceFromAttributes({
          name: "test",
          version: "1.0.0"
        })
      )
      const counter = Metric.counter("counter-bigint", {
        description: "Example",
        incremental: true,
        bigint: true
      })

      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))
      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"))
      yield* _(Metric.increment(counter), Effect.tagMetrics("key", "value"))

      const results = yield* _(Effect.promise(() => producer.collect()))
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
          "name": "counter-bigint",
          "description": "Example",
          "unit": "requests",
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
