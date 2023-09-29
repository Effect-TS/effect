import * as internal from "@effect/opentelemetry/internal/metrics"
import * as it from "@effect/opentelemetry/test/utils/extend"
import { ValueType } from "@opentelemetry/api"
import { Resource } from "@opentelemetry/resources"
import * as Effect from "effect/Effect"
import * as Metric from "effect/Metric"

const findMetric = (metrics: any, name: string) =>
  metrics.resourceMetrics.scopeMetrics[0].metrics.find((_: any) => _.descriptor.name === name)

describe("Metrics", () => {
  it.effect("gauge", () =>
    Effect.gen(function*(_) {
      const producer = new internal.MetricProducerImpl(
        new Resource({
          name: "test",
          version: "1.0.0"
        })
      )
      const gauge = Metric.gauge("rps")

      yield* _(Metric.set(gauge, 10), Effect.tagMetrics("key", "value"), Effect.tagMetrics("unit", "requests"))

      const results = yield* _(Effect.promise(() => producer.collect()))
      const object = JSON.parse(JSON.stringify(results))
      assert.deepEqual(object.resourceMetrics.resource._attributes, {
        "name": "test",
        "version": "1.0.0"
      })
      assert.equal(object.resourceMetrics.scopeMetrics.length, 1)
      const metric = findMetric(object, "rps")
      assert.deepEqual(metric, {
        "dataPointType": 2,
        "descriptor": {
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
          }
        ]
      })
    }))
})
