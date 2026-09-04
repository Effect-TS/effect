import * as OtelMetrics from "@effect/opentelemetry/OtelMetrics"
import * as Resource from "@effect/opentelemetry/Resource"
import { assert, describe, it, vi } from "@effect/vitest"
import { Cause, Context, Duration, Exit, Fiber, Layer, Metric, Ref, String } from "effect"
import * as Effect from "effect/Effect"
import { TestClock } from "effect/testing"
import { HttpClient, type HttpClientError, HttpClientResponse } from "effect/unstable/http"
import { OtlpExporter, OtlpMetrics, OtlpSerialization } from "effect/unstable/observability"

const attributes = { x: "a", y: "b" }

class TrackValue extends Context.Service<TrackValue, { readonly value: object }>()("MetricTrackValue") {}

describe("Metric", () => {
  it.effect("keeps shared metrics scoped to the active registry", () =>
    Effect.gen(function*() {
      const counter = Metric.counter(nextId())
      const registryA: Metric.MetricRegistry = new Map()
      const registryB: Metric.MetricRegistry = new Map()

      yield* Metric.update(counter, 1).pipe(Effect.provideService(Metric.MetricRegistry, registryA))
      yield* Metric.update(counter, 10).pipe(Effect.provideService(Metric.MetricRegistry, registryB))
      yield* Metric.update(counter, 2).pipe(Effect.provideService(Metric.MetricRegistry, registryA))

      const valueA = yield* Metric.value(counter).pipe(Effect.provideService(Metric.MetricRegistry, registryA))
      const valueB = yield* Metric.value(counter).pipe(Effect.provideService(Metric.MetricRegistry, registryB))
      assert.deepStrictEqual(valueA, { count: 3, incremental: false })
      assert.deepStrictEqual(valueB, { count: 10, incremental: false })
    }))

  it.effect("keeps attributed metrics scoped to the active registry", () =>
    Effect.gen(function*() {
      const counter = Metric.counter(nextId()).pipe(Metric.withAttributes(attributes))
      const registryA: Metric.MetricRegistry = new Map()
      const registryB: Metric.MetricRegistry = new Map()

      yield* Metric.update(counter, 1).pipe(Effect.provideService(Metric.MetricRegistry, registryA))
      yield* Metric.update(counter, 10).pipe(Effect.provideService(Metric.MetricRegistry, registryB))

      const valueA = yield* Metric.value(counter).pipe(Effect.provideService(Metric.MetricRegistry, registryA))
      const valueB = yield* Metric.value(counter).pipe(Effect.provideService(Metric.MetricRegistry, registryB))
      assert.strictEqual(valueA.count, 1)
      assert.strictEqual(valueB.count, 10)
    }))

  it.effect("keeps distinct attribute sets in separate series", () =>
    Effect.gen(function*() {
      const id = nextId()
      const first = Metric.counter(id, { attributes: { a: "b,c=d" } })
      const second = Metric.counter(id, { attributes: { a: "b", c: "d" } })

      yield* Metric.update(first, 1)
      yield* Metric.update(second, 10)

      assert.strictEqual((yield* Metric.value(first)).count, 1)
      assert.strictEqual((yield* Metric.value(second)).count, 10)
    }))

  it.effect("keeps equal attribute names with different values in separate series", () =>
    Effect.gen(function*() {
      const id = nextId()
      const first = Metric.counter(id, { attributes: { route: "/users", method: "GET" } })
      const second = Metric.counter(id, { attributes: { route: "/users", method: "POST" } })

      yield* Metric.update(first, 1)
      yield* Metric.update(second, 10)

      assert.strictEqual((yield* Metric.value(first)).count, 1)
    }))

  it.effect("shares a series for equal attributes in different record orders", () =>
    Effect.gen(function*() {
      const id = nextId()
      const first = Metric.counter(id, { attributes: { route: "/users", method: "GET" } })
      const second = Metric.counter(id, { attributes: { method: "GET", route: "/users" } })

      yield* Metric.update(first, 1)
      yield* Metric.update(second, 10)

      assert.strictEqual((yield* Metric.value(first)).count, 11)
    }))

  it.effect("shares a series after merging metric and contextual attributes", () =>
    Effect.gen(function*() {
      const id = nextId()
      const first = Metric.counter(id, { attributes: { route: "/users" } })
      const second = Metric.counter(id, { attributes: { method: "GET" } })
      const firstContext = { method: "GET" }

      yield* Metric.update(first, 1).pipe(Effect.provideService(Metric.CurrentMetricAttributes, firstContext))
      yield* Metric.update(second, 10).pipe(
        Effect.provideService(Metric.CurrentMetricAttributes, { route: "/users" })
      )

      assert.strictEqual(
        (yield* Metric.value(first).pipe(Effect.provideService(Metric.CurrentMetricAttributes, firstContext))).count,
        11
      )
    }))

  it.effect("preserves attribute order in snapshots", () =>
    Effect.gen(function*() {
      const metric = Metric.counter(nextId(), { attributes: { route: "/users", method: "GET" } })

      yield* Metric.update(metric, 1)
      const snapshot = yield* Metric.snapshot

      assert.deepStrictEqual(Object.keys(snapshot[0].attributes ?? {}), ["route", "method"])
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))

  it.effect.each([
    { name: "counter", makeUpdate: () => Metric.update(Metric.counter(nextId()), 1) },
    {
      name: "histogram",
      makeUpdate: () => Metric.update(Metric.histogram(nextId(), { boundaries: [1] }), 1)
    },
    { name: "frequency", makeUpdate: () => Metric.update(Metric.frequency(nextId()), "value") }
  ])("uses collection interval starts for delta $name points", ({ makeUpdate }) =>
    Effect.gen(function*() {
      const now = yield* Effect.acquireRelease(
        Effect.sync(() => vi.spyOn(Date, "now").mockReturnValue(1000)),
        (now) => Effect.sync(() => now.mockRestore())
      )
      const producer = yield* OtelMetrics.makeProducer("delta").pipe(Effect.provide(Resource.layerEmpty))
      const update = makeUpdate()
      const intervals = []

      for (const time of [2000, 3000]) {
        now.mockReturnValue(time)
        yield* update
        const result = yield* Effect.promise(() => producer.collect())
        const point = result.resourceMetrics.scopeMetrics[0].metrics[0].dataPoints[0]
        intervals.push([point.startTime, point.endTime])
      }

      assert.deepStrictEqual(intervals, [
        [[1, 0], [2, 0]],
        [[2, 0], [3, 0]]
      ])
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))

  it.effect("should be referentially transparent", () =>
    Effect.gen(function*() {
      const id = nextId()
      const counter1 = Metric.counter(id).pipe(
        Metric.withAttributes(attributes),
        Metric.withConstantInput(1)
      )
      const counter2 = Metric.counter(id).pipe(
        Metric.withAttributes(attributes),
        Metric.withConstantInput(1)
      )
      const counter3 = Metric.counter(id).pipe(
        Metric.withAttributes({ z: "c" }),
        Metric.withConstantInput(1)
      )
      yield* Effect.track(Effect.void, counter1)
      yield* Effect.track(Effect.void, counter2)
      yield* Effect.track(Effect.void, counter3)
      const result1 = yield* Metric.value(counter1)
      const result2 = yield* Metric.value(counter2)
      const result3 = yield* Metric.value(counter3)
      assert.deepStrictEqual(result1, { count: 2, incremental: false })
      assert.deepStrictEqual(result2, { count: 2, incremental: false })
      assert.deepStrictEqual(result3, { count: 1, incremental: false })
    }))

  it.effect("should dump the current state of all metrics", () =>
    Effect.gen(function*() {
      const counter1 = Metric.counter("counter").pipe(
        Metric.withAttributes(attributes),
        Metric.withConstantInput(1)
      )
      const counter2 = Metric.counter("counter").pipe(
        Metric.withAttributes(attributes),
        Metric.withConstantInput(1)
      )
      const counter3 = Metric.counter("counter").pipe(
        Metric.withAttributes({ z: "c" }),
        Metric.withConstantInput(1)
      )

      yield* Effect.track(Effect.void, counter1)
      yield* Effect.track(Effect.void, counter2)
      yield* Effect.track(Effect.void, counter3)

      const result = yield* Metric.dump
      const expected = String.stripMargin(
        `|name=counter  description=  type=Counter  attributes=[x: a, y: b]  state=[count: [2]]
         |name=counter  description=  type=Counter  attributes=[z: c]        state=[count: [1]]`
      )

      assert.strictEqual(result, expected)
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))

  it.effect("should record fiber runtime metrics once for yielded fibers", () => {
    let starts = 0
    let ends = 0
    const service: Metric.FiberRuntimeMetricsService = {
      recordFiberStart: () => {
        starts++
      },
      recordFiberEnd: () => {
        ends++
      }
    }

    return Effect.gen(function*() {
      const fiber = yield* Effect.forkChild(Effect.gen(function*() {
        yield* Effect.yieldNow
        yield* Effect.yieldNow
      }))

      yield* Fiber.join(fiber)

      assert.strictEqual(starts, 1)
      assert.strictEqual(ends, 1)
    }).pipe(Effect.provideService(Metric.FiberRuntimeMetrics, service))
  })

  describe("Counter", () => {
    it.effect("exports negative updates as deltas", () =>
      Effect.gen(function*() {
        type ExportRequest = {
          readonly resourceMetrics: ReadonlyArray<{
            readonly scopeMetrics: ReadonlyArray<{
              readonly metrics: ReadonlyArray<{
                readonly name: string
                readonly sum?: {
                  readonly dataPoints: ReadonlyArray<{ readonly asDouble?: number }>
                }
              }>
            }>
          }>
        }

        const requests = yield* Ref.make<ReadonlyArray<ExportRequest>>([])
        const client = HttpClient.makeWith(
          Effect.fnUntraced(function*(requestEffect) {
            const request = yield* requestEffect
            if (request.body._tag === "Uint8Array") {
              const body = JSON.parse(new TextDecoder().decode(request.body.body)) as ExportRequest
              yield* Ref.update(requests, (requests) => [...requests, body])
            }
            return HttpClientResponse.fromWeb(request, new Response())
          }),
          Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
        )
        const layer = OtlpMetrics.layer({
          url: "http://localhost:4318/v1/metrics",
          resource: { serviceName: "test" },
          temporality: "delta",
          exportInterval: "1 hour"
        }).pipe(
          Layer.provide(OtlpSerialization.layerJson),
          Layer.provideMerge(Layer.succeed(HttpClient.HttpClient, client))
        )

        const values = yield* Effect.gen(function*() {
          const counter = Metric.counter("counter_delta")
          const flusher = yield* OtlpExporter.Flusher
          for (const update of [5, -2, 4]) {
            yield* Metric.update(counter, update)
            yield* flusher.flush
          }
          return (yield* Ref.get(requests)).map((request) =>
            request.resourceMetrics[0].scopeMetrics[0].metrics.find((metric) => metric.name === "counter_delta")
              ?.sum?.dataPoints[0].asDouble
          )
        }).pipe(
          Effect.provide(layer),
          Effect.provideService(Metric.MetricRegistry, new Map())
        )

        assert.deepStrictEqual(values, [5, -2, 4])
      }))

    it.effect("custom increment with value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(1), counter)
        yield* Effect.trackSuccesses(Effect.succeed(2), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 3, incremental: false })
      }))

    it.effect("custom increment with constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(1)
        )
        yield* Effect.trackSuccesses(Effect.succeed(1), counter)
        yield* Effect.trackSuccesses(Effect.succeed(2), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 2, incremental: false })
      }))

    it.effect("custom decrement with value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(-1), counter)
        yield* Effect.trackSuccesses(Effect.succeed(-2), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: -3, incremental: false })
      }))

    it.effect("custom decrement with constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(-1)
        )
        yield* Effect.trackSuccesses(Effect.succeed(-1), counter)
        yield* Effect.trackSuccesses(Effect.succeed(-2), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: -2, incremental: false })
      }))

    it.effect("custom increment with bigint value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id, { bigint: true }).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(1)), counter)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(2)), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: BigInt(3), incremental: false })
      }))

    it.effect("custom increment with bigint constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id, { bigint: true }).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(BigInt(1))
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(1)), counter)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(2)), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: BigInt(2), incremental: false })
      }))

    it.effect("custom decrement with bigint value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id, { bigint: true }).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-1)), counter)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-2)), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: BigInt(-3), incremental: false })
      }))

    it.effect("custom decrement with bigint constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id, { bigint: true }).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(BigInt(-1))
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-1)), counter)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-2)), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: BigInt(-2), incremental: false })
      }))

    it.effect("fails to decrement incremental counter", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id, { incremental: true }).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(-1)
        )
        yield* Effect.trackSuccesses(Effect.succeed(-1), counter)
        yield* Effect.trackSuccesses(Effect.succeed(-2), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 0, incremental: true })
      }))

    it.effect("fails to decrement incremental bigint counter", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id, { bigint: true, incremental: true }).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(BigInt(-1))
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-1)), counter)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-2)), counter)
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: BigInt(0), incremental: true })
      }))
  })

  describe("Gauge", () => {
    it.effect("custom set with value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(1), gauge)
        yield* Effect.trackSuccesses(Effect.succeed(2), gauge)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: 2 })
      }))

    it.effect("custom set with constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(1)
        )
        yield* Effect.trackSuccesses(Effect.succeed(1), gauge)
        yield* Effect.trackSuccesses(Effect.succeed(2), gauge)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: 1 })
      }))

    it.effect("custom set with negative value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(-1), gauge)
        yield* Effect.trackSuccesses(Effect.succeed(-2), gauge)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: -2 })
      }))

    it.effect("custom set with negative constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(-1)
        )
        yield* Effect.trackSuccesses(Effect.succeed(-1), gauge)
        yield* Effect.trackSuccesses(Effect.succeed(-2), gauge)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: -1 })
      }))

    it.effect("custom set with bigint value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id, { bigint: true }).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(1)), gauge)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(2)), gauge)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: BigInt(2) })
      }))

    it.effect("custom set with bigint constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id, { bigint: true }).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(BigInt(1))
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(1)), gauge)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(2)), gauge)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: BigInt(1) })
      }))

    it.effect("custom set with negative bigint value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id, { bigint: true }).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-1)), gauge)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-2)), gauge)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: BigInt(-2) })
      }))

    it.effect("custom set with negative bigint constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id, { bigint: true }).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(BigInt(-1))
        )
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-1)), gauge)
        yield* Effect.trackSuccesses(Effect.succeed(BigInt(-2)), gauge)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: BigInt(-1) })
      }))
  })

  describe("Frequency", () => {
    it.effect("custom occurence with value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const frequency = Metric.frequency(id).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed("foo"), frequency)
        yield* Effect.trackSuccesses(Effect.succeed("bar"), frequency)
        const result = yield* Metric.value(frequency)
        assert.deepStrictEqual(result, {
          occurrences: new Map([["foo", 1], ["bar", 1]])
        })
      }))

    it.effect("custom set with constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const frequency = Metric.frequency(id).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput("constant")
        )
        yield* Effect.trackSuccesses(Effect.succeed("foo"), frequency)
        yield* Effect.trackSuccesses(Effect.succeed("bar"), frequency)
        const result = yield* Metric.value(frequency)
        assert.deepStrictEqual(result, {
          occurrences: new Map([["constant", 2]])
        })
      }))
  })

  it.effect("uses finite extrema for empty histogram and summary states", () =>
    Effect.gen(function*() {
      const histogram = Metric.histogram(nextId(), { boundaries: [] })
      const summary = Metric.summary(nextId(), {
        maxAge: "1 minute",
        maxSize: 10,
        quantiles: []
      })
      const histogramState = yield* Metric.value(histogram)
      const summaryState = yield* Metric.value(summary)
      assert.deepStrictEqual(
        { min: histogramState.min, max: histogramState.max },
        { min: Number.MAX_VALUE, max: -Number.MAX_VALUE }
      )
      assert.deepStrictEqual(
        { min: summaryState.min, max: summaryState.max },
        { min: Number.MAX_VALUE, max: -Number.MAX_VALUE }
      )
    }))

  it("creates evenly spaced linear boundaries", () => {
    assert.deepStrictEqual(
      Metric.linearBoundaries({ start: 10, width: 20, count: 5 }),
      [10, 30, 50, 70, Number.POSITIVE_INFINITY]
    )
  })

  describe("Histogram", () => {
    it.effect("reports the maximum for negative-only observations", () =>
      Effect.gen(function*() {
        const histogram = Metric.histogram(nextId(), { boundaries: [-10, -5, 0] })
        yield* Metric.update(histogram, -10)
        yield* Metric.update(histogram, -5)
        const result = yield* Metric.value(histogram)
        assert.strictEqual(result.min, -10)
        assert.strictEqual(result.max, -5)
      }))

    it.effect("custom observe with value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const boundaries = Metric.linearBoundaries({ start: 0, width: 1, count: 10 })
        const histogram = Metric.histogram(id, { boundaries }).pipe(
          Metric.withAttributes(attributes)
        )
        yield* Effect.trackSuccesses(Effect.succeed(1), histogram)
        yield* Effect.trackSuccesses(Effect.succeed(3), histogram)
        const result = yield* Metric.value(histogram)
        assert.deepStrictEqual(result, {
          buckets: makeBuckets(boundaries, [1, 3]),
          count: 2,
          sum: 4,
          min: 1,
          max: 3
        })
      }))

    it.effect("custom observe with constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const boundaries = Metric.linearBoundaries({ start: 0, width: 1, count: 10 })
        const histogram = Metric.histogram(id, { boundaries }).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(1)
        )
        yield* Effect.trackSuccesses(Effect.succeed(1), histogram)
        yield* Effect.trackSuccesses(Effect.succeed(3), histogram)
        const result = yield* Metric.value(histogram)
        assert.deepStrictEqual(result, {
          buckets: makeBuckets(boundaries, [1, 1]),
          count: 2,
          sum: 2,
          min: 1,
          max: 1
        })
      }))

    it.effect("preserves precision of boundary values", () =>
      Effect.gen(function*() {
        const boundaries = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1]

        const histogram = Metric.histogram("precision_test", { boundaries })

        const result = yield* Metric.value(histogram)

        result.buckets.forEach(([boundary], index) => {
          if (index < boundaries.length) {
            assert.strictEqual(boundary, boundaries[index])
          }
        })
      }))
  })

  describe("Summary", () => {
    it.effect("reports the maximum for negative-only observations", () =>
      Effect.gen(function*() {
        const summary = Metric.summary(nextId(), {
          maxAge: "1 minute",
          maxSize: 10,
          quantiles: [0.5]
        })
        yield* Metric.update(summary, -10)
        yield* Metric.update(summary, -5)
        const result = yield* Metric.value(summary)
        assert.strictEqual(result.min, -10)
        assert.strictEqual(result.max, -5)
      }))

    it.effect("custom observe with value", () =>
      Effect.gen(function*() {
        const id = nextId()
        const quantiles = [0, 0.1, .9]
        const summary = Metric.summary(id, {
          maxAge: "1 minute",
          maxSize: 10,
          quantiles
        }).pipe(Metric.withAttributes(attributes))
        yield* Effect.trackSuccesses(Effect.succeed(1), summary)
        yield* Effect.trackSuccesses(Effect.succeed(3), summary)
        const result = yield* Metric.value(summary)
        assert.deepStrictEqual(result, {
          quantiles: [[0, 1], [0.1, 1], [0.9, 3]],
          count: 2,
          sum: 4,
          min: 1,
          max: 3
        })
      }))

    it.effect("custom observe with constant", () =>
      Effect.gen(function*() {
        const id = nextId()
        const quantiles = [0, 0.1, .9]
        const summary = Metric.summary(id, {
          maxAge: "1 minute",
          maxSize: 10,
          quantiles
        }).pipe(
          Metric.withAttributes(attributes),
          Metric.withConstantInput(1)
        )
        yield* Effect.trackSuccesses(Effect.succeed(1), summary)
        yield* Effect.trackSuccesses(Effect.succeed(3), summary)
        const result = yield* Metric.value(summary)
        assert.deepStrictEqual(result, {
          quantiles: [[0, 1], [0.1, 1], [0.9, 1]],
          count: 2,
          sum: 2,
          min: 1,
          max: 1
        })
      }))

    it.effect("should return the correct quantile when the first chunk overshoots", () =>
      Effect.gen(function*() {
        const id = nextId()
        const samples = [10, 10, 10, 10, 10, 10, 20, 30, 40, 50]
        const summary = Metric.summary(id, {
          maxAge: "1 minute",
          maxSize: 15,
          quantiles: [0.5]
        })
        yield* Effect.forEach(samples, (sample) => Metric.update(summary, sample))
        const result = yield* Metric.value(summary)
        assert.deepStrictEqual(result, {
          quantiles: [[0.5, 10]],
          count: 10,
          min: 10,
          max: 50,
          sum: 200
        })
      }))
  })

  describe("track", () => {
    it.effect("updates on success", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.succeed(1).pipe(
          Effect.track(counter)
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 1, incremental: false })
      }))

    it.effect("updates on failure", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.fail(1).pipe(
          Effect.track(counter),
          Effect.exit
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 1, incremental: false })
      }))

    it.effect("updates on defect", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.die(1).pipe(
          Effect.track(counter),
          Effect.exit
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 1, incremental: false })
      }))
  })

  describe("track", () => {
    it.effect("maps exits while preserving the instrumented effect result", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(
          Metric.withConstantInput(1)
        )
        yield* Effect.succeed(1).pipe(
          Effect.track(counter)
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 1, incremental: false })
      }))

    it.effect("updates on failure", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(
          Metric.withConstantInput(1)
        )
        yield* Effect.fail(1).pipe(
          Effect.track(counter),
          Effect.exit
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 1, incremental: false })
      }))

    it.effect("updates on defect", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(
          Metric.withConstantInput(1)
        )
        yield* Effect.die(1).pipe(
          Effect.track(counter),
          Effect.exit
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 1, incremental: false })
      }))

    it.effect("passes the success object to the saved mapper and preserves it", () =>
      Effect.gen(function*() {
        const value = { result: 42 }
        const seen: Array<Exit.Exit<object, Error>> = []
        const counter = Metric.counter(nextId())
        const observe = Effect.track(counter, (exit: Exit.Exit<object, Error>) => {
          seen.push(exit)
          return 7
        })
        const result = yield* observe(Effect.succeed(value))
        assert.strictEqual(result, value)
        assert.strictEqual(seen.length, 1)
        const observed = seen[0]
        assert.strictEqual(Exit.isSuccess(observed), true)
        if (Exit.isSuccess(observed)) assert.strictEqual(observed.value, value)
        assert.deepStrictEqual(yield* Metric.value(counter), { count: 7, incremental: false })
      }))

    it.effect("passes the original error and Cause through a matching pipe mapper", () =>
      Effect.gen(function*() {
        const error = new Error("synthetic mapped failure")
        const cause = Cause.fail(error)
        const seen: Array<Exit.Exit<number, Error>> = []
        const counter = Metric.counter(nextId())
        const result = yield* Effect.failCause(cause).pipe(
          Effect.track(counter, (exit: Exit.Exit<number, Error>) => {
            seen.push(exit)
            return 3
          }),
          Effect.exit
        )
        assert.strictEqual(Exit.isFailure(result), true)
        if (Exit.isFailure(result)) assert.strictEqual(result.cause, cause)
        assert.strictEqual(seen.length, 1)
        const observed = seen[0]
        assert.strictEqual(Exit.isFailure(observed), true)
        if (Exit.isFailure(observed)) {
          assert.strictEqual(observed.cause, cause)
          const reason = observed.cause.reasons[0]
          assert.strictEqual(Cause.isFailReason(reason), true)
          if (Cause.isFailReason(reason)) assert.strictEqual(reason.error, error)
        }
        assert.deepStrictEqual(yield* Metric.value(counter), { count: 3, incremental: false })
      }))

    it.effect("keeps direct matching calls and service requirements", () =>
      Effect.gen(function*() {
        const value = { result: 42 }
        const counter = Metric.counter(nextId())
        const seen: Array<object> = []
        const source = Effect.map(TrackValue, (service) => service.value)
        const wrapped = Effect.track(source, counter, (exit: Exit.Exit<object, Error>) => {
          if (Exit.isSuccess(exit)) seen.push(exit.value)
          return 2
        })
        const result = yield* Effect.provideService(wrapped, TrackValue, { value })
        assert.strictEqual(result, value)
        assert.strictEqual(seen.length, 1)
        assert.strictEqual(seen[0], value)
        assert.deepStrictEqual(yield* Metric.value(counter), { count: 2, incremental: false })
      }))

    it.effect("allows broad unknown mappers with compatible error and value inputs", () =>
      Effect.gen(function*() {
        const cause = Cause.fail(7)
        const counter = Metric.counter(nextId())
        let calls = 0
        const observe = Effect.track(counter, (exit: Exit.Exit<number, unknown>) => {
          calls++
          return Exit.isSuccess(exit) ? exit.value : 1
        })
        const success = yield* observe(Effect.succeed(5))
        const failure = yield* Effect.exit(observe(Effect.failCause(cause)))
        assert.strictEqual(success, 5)
        assert.strictEqual(Exit.isFailure(failure), true)
        if (Exit.isFailure(failure)) assert.strictEqual(failure.cause, cause)
        assert.strictEqual(calls, 2)
        assert.deepStrictEqual(yield* Metric.value(counter), { count: 6, incremental: false })
      }))
  })

  describe("trackErrors", () => {
    it.effect("does not update on success", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.succeed(1).pipe(
          Effect.trackErrors(counter)
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 0, incremental: false })
      }))

    it.effect("updates on failure", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.fail(1).pipe(
          Effect.trackErrors(counter),
          Effect.exit
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 1, incremental: false })
      }))

    it.effect("does not update on defect", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.die(1).pipe(
          Effect.trackErrors(counter),
          Effect.exit
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 0, incremental: false })
      }))
  })

  describe("trackDefects", () => {
    it.effect("does not update on success", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.succeed(1).pipe(
          Effect.trackDefects(counter)
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 0, incremental: false })
      }))

    it.effect("does not update on failure", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.fail(1).pipe(
          Effect.trackDefects(counter),
          Effect.exit
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 0, incremental: false })
      }))

    it.effect("updates on defect", () =>
      Effect.gen(function*() {
        const id = nextId()
        const counter = Metric.counter(id).pipe(Metric.withConstantInput(1))
        yield* Effect.die(1).pipe(
          Effect.trackDefects(counter),
          Effect.exit
        )
        const result = yield* Metric.value(counter)
        assert.deepStrictEqual(result, { count: 1, incremental: false })
      }))
  })

  describe("trackDuration", () => {
    it.effect("tracks execution duration", () =>
      Effect.gen(function*() {
        const id = nextId()
        const timer = Metric.timer(id)
        const fiber = yield* Effect.sleep("1 hour").pipe(
          Effect.trackDuration(timer),
          Effect.forkChild
        )
        yield* TestClock.adjust("1 hour")
        yield* Fiber.join(fiber)
        const result = yield* Metric.value(timer)
        assert.strictEqual(result.count, 1)
        assert.strictEqual(result.min, Duration.toMillis(Duration.hours(1)))
        assert.strictEqual(result.max, Duration.toMillis(Duration.hours(1)))
        assert.strictEqual(result.sum, Duration.toMillis(Duration.hours(1)))
      }))

    it.effect("uses monotonic time when wall time moves backward", () =>
      Effect.gen(function*() {
        const id = nextId()
        const timer = Metric.timer(id)
        yield* TestClock.setTime(1_000)
        yield* Effect.gen(function*() {
          yield* TestClock.adjust("100 millis")
          yield* TestClock.setTime(0)
        }).pipe(Effect.trackDuration(timer))

        const result = yield* Metric.value(timer)
        assert.strictEqual(result.count, 1)
        assert.strictEqual(result.min, 100)
        assert.strictEqual(result.max, 100)
        assert.strictEqual(result.sum, 100)
      }))
  })

  describe("trackDurationWith", () => {
    it.effect("tracks execution duration", () =>
      Effect.gen(function*() {
        const id = nextId()
        const gauge = Metric.gauge(id)
        const fiber = yield* Effect.sleep("1 hour").pipe(
          Effect.trackDuration(gauge, (duration) => Duration.toMinutes(duration)),
          Effect.forkChild
        )
        yield* TestClock.adjust("1 hour")
        yield* Fiber.join(fiber)
        const result = yield* Metric.value(gauge)
        assert.deepStrictEqual(result, { value: 60 })
      }))
  })
})

let idCounter = 0
function nextId() {
  return `metric-${++idCounter}`
}

const makeBuckets = (
  boundaries: ReadonlyArray<number>,
  values: ReadonlyArray<number>
): ReadonlyArray<[number, number]> => {
  const results: Array<[number, number]> = []
  let count = 0
  let index = 0
  for (const bucket of boundaries) {
    while (index < values.length && values[index] <= bucket) {
      count++
      index++
    }
    results.push([bucket, count])
  }
  return results
}
