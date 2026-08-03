import * as internal from "@effect/opentelemetry/internal/metrics"
import { assert, it } from "@effect/vitest"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { MetricReader } from "@opentelemetry/sdk-metrics"
import * as Effect from "effect/Effect"
import * as Metric from "effect/Metric"

it.effect("reports the same delta to every registered reader", () =>
  Effect.gen(function*() {
    class Reader extends MetricReader {
      protected onShutdown(): Promise<void> {
        return Promise.resolve()
      }
      protected onForceFlush(): Promise<void> {
        return Promise.resolve()
      }
    }

    const services = yield* Effect.context<never>()
    const producer = new internal.MetricProducerImpl(resourceFromAttributes({}), services, "delta")
    const first = new Reader()
    const second = new Reader()
    first.setMetricProducer(producer)
    second.setMetricProducer(producer)
    yield* Metric.update(Metric.counter("requests", { incremental: true }), 1)

    const firstResult = yield* Effect.promise(() => first.collect())
    const secondResult = yield* Effect.promise(() => second.collect())
    const firstValue = (firstResult.resourceMetrics.scopeMetrics[0]!.metrics[0] as any).dataPoints[0].value
    const secondValue = (secondResult.resourceMetrics.scopeMetrics[0]!.metrics[0] as any).dataPoints[0].value
    assert.deepStrictEqual([firstValue, secondValue], [1, 1])
  }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))
