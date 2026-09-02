import * as OtelMetrics from "@effect/opentelemetry/OtelMetrics"
import * as Resource from "@effect/opentelemetry/Resource"
import { assert, describe, it, vi } from "@effect/vitest"
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  PeriodicExportingMetricReader
} from "@opentelemetry/sdk-metrics"
import { Effect, Metric } from "effect"
import { TestClock } from "effect/testing"

describe.sequential("metric collection intervals", () => {
  for (const temporality of ["delta", "cumulative"] as const) {
    it.effect.each([
      { name: "counter", update: Metric.update(Metric.counter("counter"), 1) },
      { name: "histogram", update: Metric.update(Metric.histogram("histogram", { boundaries: [5, 15] }), 10) },
      { name: "frequency", update: Metric.update(Metric.frequency("frequency"), "a") },
      { name: "gauge", update: Metric.update(Metric.gauge("gauge"), 10) },
      {
        name: "summary",
        update: Metric.update(Metric.summary("summary", { maxAge: "1 minute", maxSize: 10, quantiles: [0.5] }), 10)
      }
    ])(`$name (${temporality})`, ({ name, update }) =>
      Effect.gen(function*() {
        // The SDK adapter reads native Date, while summary observations use the Effect clock.
        const now = yield* Effect.acquireRelease(
          Effect.sync(() => vi.spyOn(Date, "now").mockReturnValue(1000)),
          (now) => Effect.sync(() => now.mockRestore())
        )
        yield* TestClock.setTime(1000)
        const aggregationTemporality = temporality === "delta"
          ? AggregationTemporality.DELTA
          : AggregationTemporality.CUMULATIVE
        const exporter = new InMemoryMetricExporter(aggregationTemporality)
        const reader = new PeriodicExportingMetricReader({ exporter, exportIntervalMillis: 3_600_000 })
        const producer = yield* OtelMetrics.makeProducer(temporality).pipe(Effect.provide(Resource.layerEmpty))
        yield* OtelMetrics.registerProducer(producer, () => reader)

        for (const time of [2000, 3000, 4000]) {
          now.mockReturnValue(time)
          yield* TestClock.setTime(time)
          yield* update
          yield* Effect.promise(() => reader.forceFlush())
        }

        const exports = exporter.getMetrics()
        assert.strictEqual(exports.length, 3)
        const names = name === "summary" ? ["summary_count", "summary_sum", "summary_quantiles"] : [name]
        for (const metricName of names) {
          const metrics = exports.map((resource) =>
            resource.scopeMetrics[0].metrics.find((metric) => metric.descriptor.name === metricName)!
          )
          for (const metric of metrics) {
            assert.strictEqual(
              metric.aggregationTemporality,
              name === "gauge" ? AggregationTemporality.CUMULATIVE : aggregationTemporality
            )
          }
          const intervals = metrics.map((metric) => metric.dataPoints.map((point) => [point.startTime, point.endTime]))
          const expected = [2, 3, 4].map((end) =>
            Array.from({ length: metricName === "summary_quantiles" ? 3 : 1 }, () => [
              [temporality === "delta" && name !== "gauge" ? end - 1 : 1, 0],
              [end, 0]
            ])
          )
          assert.deepStrictEqual(intervals, expected, metricName)
        }
      }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))
  }
})
