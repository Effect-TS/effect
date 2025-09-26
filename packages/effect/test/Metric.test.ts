import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import {
  Array,
  Clock,
  Duration,
  Effect,
  Equal,
  Fiber,
  Metric,
  MetricBoundaries,
  MetricKey,
  MetricLabel,
  MetricPolling,
  MetricState,
  Option,
  pipe,
  Schedule
} from "effect"

const labels = [MetricLabel.make("x", "a"), MetricLabel.make("y", "b")]

const makePollingGauge = (name: string, increment: number) => {
  const gauge = Metric.gauge(name)
  const metric = MetricPolling.make(gauge, Metric.value(gauge).pipe(Effect.map((gauge) => gauge.value + increment)))
  return [gauge, metric] as const
}

let nameCount = 0
const nextName = () => `m${++nameCount}`

describe("Metric", () => {
  describe("Counter", () => {
    it.effect("custom increment as aspect", () =>
      Effect.gen(function*() {
        const id = nextName()
        const counter = Metric.counter(id).pipe(Metric.taggedWithLabels(labels), Metric.withConstantInput(1))
        const result = yield* counter(Effect.void).pipe(
          Effect.zipRight(counter(Effect.void)),
          Effect.zipRight(Metric.value(counter))
        )
        deepStrictEqual(result, MetricState.counter(2))
      }))
    it.effect("direct increment", () =>
      Effect.gen(function*() {
        const id = nextName()
        const counter = Metric.counter(id).pipe(Metric.taggedWithLabels(labels))
        const result = yield* Metric.increment(counter).pipe(
          Effect.zipRight(Metric.increment(counter)),
          Effect.zipRight(Metric.value(counter))
        )
        deepStrictEqual(result, MetricState.counter(2))
      }))

    it.effect("direct increment bigint", () =>
      Effect.gen(function*() {
        const name = nextName()
        const counter = Metric.counter(name, {
          bigint: true
        }).pipe(Metric.taggedWithLabels(labels))
        const result = yield* Metric.increment(counter).pipe(
          Effect.zipRight(Metric.increment(counter)),
          Effect.zipRight(Metric.value(counter))
        )
        deepStrictEqual(result, MetricState.counter(BigInt(2)))
      }))

    it.effect("cannot decrement incremental", () =>
      Effect.gen(function*() {
        const name = nextName()
        const counter = Metric.counter(name, { incremental: true }).pipe(Metric.taggedWithLabels(labels))
        const result = yield* Metric.increment(counter).pipe(
          Effect.zipRight(Metric.increment(counter)),
          Effect.zipRight(Metric.incrementBy(counter, -1)),
          Effect.zipRight(Metric.value(counter))
        )
        deepStrictEqual(result, MetricState.counter(2))
      }))

    it.effect("cannot decrement incremental bigint", () =>
      Effect.gen(function*() {
        const name = nextName()
        const counter = Metric.counter(name, {
          incremental: true,
          bigint: true
        }).pipe(Metric.taggedWithLabels(labels))
        const result = yield* Metric.increment(counter).pipe(
          Effect.zipRight(Metric.increment(counter)),
          Effect.zipRight(Metric.incrementBy(counter, BigInt(-1))),
          Effect.zipRight(Metric.value(counter))
        )
        deepStrictEqual(result, MetricState.counter(BigInt(2)))
      }))

    it.effect("custom increment by value as aspect", () =>
      Effect.gen(function*() {
        const name = nextName()
        const counter = Metric.counter(name).pipe(Metric.taggedWithLabels(labels))
        const result = yield* counter(Effect.succeed(10)).pipe(
          Effect.zipRight(counter(Effect.succeed(5))),
          Effect.zipRight(Metric.value(counter))
        )
        deepStrictEqual(result, MetricState.counter(15))
      }))

    it.effect("custom increment by bigint value as aspect", () =>
      Effect.gen(function*() {
        const name = nextName()
        const counter = Metric.counter(name, { bigint: true }).pipe(Metric.taggedWithLabels(labels))
        const result = yield* counter(Effect.succeed(BigInt(10))).pipe(
          Effect.zipRight(counter(Effect.succeed(BigInt(5)))),
          Effect.zipRight(Metric.value(counter))
        )
        deepStrictEqual(result, MetricState.counter(BigInt(15)))
      }))

    it.effect("direct increment referential transparency", () =>
      Effect.gen(function*() {
        const name = nextName()
        const result = yield* pipe(
          Effect.void,
          Effect.withMetric(
            Metric.counter(name).pipe(
              Metric.taggedWithLabels(labels),
              Metric.withConstantInput(1)
            )
          ),
          Effect.zipRight(
            pipe(
              Effect.void,
              Effect.withMetric(pipe(
                Metric.counter(name),
                Metric.taggedWithLabels(labels),
                Metric.withConstantInput(1)
              ))
            )
          ),
          Effect.zipRight(pipe(
            Metric.counter(name),
            Metric.taggedWithLabels(labels),
            Metric.withConstantInput(1),
            Metric.value
          ))
        )
        deepStrictEqual(result, MetricState.counter(2))
      }))
    it.effect("custom increment referential transparency", () =>
      Effect.gen(function*() {
        const name = nextName()
        const result = yield* pipe(
          Effect.succeed(10),
          Effect.withMetric(pipe(Metric.counter(name), Metric.taggedWithLabels(labels))),
          Effect.zipRight(
            pipe(Effect.succeed(5), Effect.withMetric(pipe(Metric.counter(name), Metric.taggedWithLabels(labels))))
          ),
          Effect.zipRight(pipe(Metric.counter(name), Metric.taggedWithLabels(labels), Metric.value))
        )
        deepStrictEqual(result, MetricState.counter(15))
      }))
    it.effect("custom increment with mapInput", () =>
      Effect.gen(function*() {
        const name = nextName()
        const result = yield* pipe(
          Effect.succeed("hello"),
          Effect.withMetric(
            pipe(
              Metric.counter(name),
              Metric.taggedWithLabels(labels),
              Metric.mapInput((input: string) => input.length)
            )
          ),
          Effect.zipRight(
            pipe(
              Effect.succeed("!"),
              Effect.withMetric(
                pipe(
                  Metric.counter(name),
                  Metric.taggedWithLabels(labels),
                  Metric.mapInput((input: string) => input.length)
                )
              )
            )
          ),
          Effect.zipRight(pipe(Metric.counter(name), Metric.taggedWithLabels(labels), Metric.value))
        )
        deepStrictEqual(result, MetricState.counter(6))
      }))
    it.effect("does not count errors", () =>
      Effect.gen(function*() {
        const name = nextName()
        const counter = pipe(Metric.counter(name), Metric.withConstantInput(1))
        const result = yield* pipe(
          Effect.void,
          Effect.withMetric(counter),
          Effect.zipRight(pipe(Effect.fail("error"), Effect.withMetric(counter), Effect.ignore)),
          Effect.zipRight(Metric.value(counter))
        )
        deepStrictEqual(result, MetricState.counter(1))
      }))
    it.effect("count + taggedWith", () =>
      Effect.gen(function*() {
        const name = nextName()
        const base = pipe(Metric.counter(name), Metric.tagged("static", "0"), Metric.withConstantInput(1))
        const counter = pipe(
          base,
          Metric.taggedWithLabelsInput((input: string) => [MetricLabel.make("dyn", input)])
        )
        const result = yield* pipe(
          Effect.succeed("hello"),
          Effect.withMetric(counter),
          Effect.zipRight(pipe(Effect.succeed("!"), Effect.withMetric(counter))),
          Effect.zipRight(pipe(Effect.succeed("!"), Effect.withMetric(counter))),
          Effect.zipRight(pipe(base, Metric.tagged("dyn", "!"), Metric.value))
        )
        deepStrictEqual(result, MetricState.counter(2))
      }))
    it.effect("tags are a region setting", () =>
      Effect.gen(function*() {
        const name = nextName()
        const counter = Metric.counter(name)
        const result = yield* pipe(
          Metric.increment(counter),
          Effect.tagMetrics({ key: "value" }),
          Effect.zipRight(
            pipe(
              counter,
              Metric.tagged("key", "value"),
              Metric.value
            )
          )
        )
        deepStrictEqual(result, MetricState.counter(1))
      }))
  })
  describe("Frequency", () => {
    it.effect("custom occurrences as aspect", () =>
      Effect.gen(function*() {
        const name = nextName()
        const frequency = pipe(Metric.frequency(name), Metric.taggedWithLabels(labels))
        const result = yield* pipe(
          Effect.succeed("hello"),
          Effect.withMetric(frequency),
          Effect.zipRight(pipe(Effect.succeed("hello"), Effect.withMetric(frequency))),
          Effect.zipRight(pipe(Effect.succeed("world"), Effect.withMetric(frequency))),
          Effect.zipRight(Metric.value(frequency))
        )
        deepStrictEqual(result.occurrences, new Map([["hello", 2] as const, ["world", 1] as const]))
      }))
    it.effect("direct occurrences", () =>
      Effect.gen(function*() {
        const name = nextName()
        const frequency = pipe(Metric.frequency(name), Metric.taggedWithLabels(labels))
        const result = yield* pipe(
          frequency,
          Metric.update("hello"),
          Effect.zipRight(pipe(frequency, Metric.update("hello"))),
          Effect.zipRight(pipe(frequency, Metric.update("world"))),
          Effect.zipRight(Metric.value(frequency))
        )
        deepStrictEqual(result.occurrences, new Map([["hello", 2] as const, ["world", 1] as const]))
      }))
    it.effect("custom occurrences with mapInput", () =>
      Effect.gen(function*() {
        const name = nextName()
        const frequency = pipe(
          Metric.frequency(name),
          Metric.taggedWithLabels(labels),
          Metric.mapInput((n: number) => `${n}`)
        )
        const result = yield* pipe(
          Effect.succeed(1),
          Effect.withMetric(frequency),
          Effect.zipRight(pipe(Effect.succeed(1), Effect.withMetric(frequency))),
          Effect.zipRight(pipe(Effect.succeed(2), Effect.withMetric(frequency))),
          Effect.zipRight(Metric.value(frequency))
        )
        deepStrictEqual(result.occurrences, new Map([["1", 2] as const, ["2", 1] as const]))
      }))
    it.effect("occurences + taggedWith", () =>
      Effect.gen(function*() {
        const name = nextName()
        const base = pipe(Metric.frequency(name), Metric.taggedWithLabels(labels))
        const frequency = pipe(
          base,
          Metric.taggedWithLabelsInput((s: string) => [MetricLabel.make("dyn", s)])
        )
        const { result1, result2, result3 } = yield* pipe(
          Effect.succeed("hello"),
          Effect.withMetric(frequency),
          Effect.zipRight(pipe(Effect.succeed("hello"), Effect.withMetric(frequency))),
          Effect.zipRight(pipe(Effect.succeed("world"), Effect.withMetric(frequency))),
          Effect.zipRight(Effect.all({
            result1: Metric.value(base),
            result2: pipe(base, Metric.tagged("dyn", "hello"), Metric.value),
            result3: pipe(base, Metric.tagged("dyn", "world"), Metric.value)
          }))
        )
        strictEqual(result1.occurrences.size, 0)
        deepStrictEqual(result2.occurrences, new Map([["hello", 2] as const]))
        deepStrictEqual(result3.occurrences, new Map([["world", 1] as const]))
      }))
  })
  describe("Gauge", () => {
    it.effect("custom set as aspect", () =>
      Effect.gen(function*() {
        const name = nextName()
        const gauge = pipe(Metric.gauge(name), Metric.taggedWithLabels(labels))
        const result = yield* pipe(
          Effect.succeed(1),
          Effect.withMetric(gauge),
          Effect.zipRight(pipe(Effect.succeed(3), Effect.withMetric(gauge))),
          Effect.zipRight(Metric.value(gauge))
        )
        deepStrictEqual(result, MetricState.gauge(3))
      }))
    it.effect("direct set", () =>
      Effect.gen(function*() {
        const name = nextName()
        const gauge = pipe(Metric.gauge(name), Metric.taggedWithLabels(labels))
        const result = yield* pipe(
          gauge,
          Metric.set(1),
          Effect.zipRight(pipe(gauge, Metric.set(3))),
          Effect.zipRight(Metric.value(gauge))
        )
        deepStrictEqual(result, MetricState.gauge(3))
      }))
    it.effect("increment", () =>
      Effect.gen(function*() {
        const name = nextName()
        const gauge = pipe(Metric.gauge(name), Metric.taggedWithLabels(labels))
        yield* Effect.forEach(Array.range(0, 99), () => Metric.increment(gauge), { concurrency: "unbounded" })
        const result = yield* Metric.value(gauge)
        deepStrictEqual(result, MetricState.gauge(100))
      }))
    it.effect("custom set with mapInput", () =>
      Effect.gen(function*() {
        const name = nextName()
        const gauge = pipe(Metric.gauge(name), Metric.taggedWithLabels(labels), Metric.mapInput((n: number) => n * 2))
        const result = yield* pipe(
          Effect.succeed(1),
          Effect.withMetric(gauge),
          Effect.zipRight(pipe(Effect.succeed(3), Effect.withMetric(gauge))),
          Effect.zipRight(Metric.value(gauge))
        )
        deepStrictEqual(result, MetricState.gauge(6))
      }))
    it.effect("gauge + taggedWith", () =>
      Effect.gen(function*() {
        const name = nextName()
        const base = pipe(Metric.gauge(name), Metric.tagged("static", "0"), Metric.mapInput((s: string) => s.length))
        const gauge = pipe(
          base,
          Metric.taggedWithLabelsInput((input: string) => [MetricLabel.make("dyn", input)])
        )
        const result = yield* pipe(
          Effect.succeed("hello"),
          Effect.withMetric(gauge),
          Effect.zipRight(pipe(Effect.succeed("!"), Effect.withMetric(gauge))),
          Effect.zipRight(pipe(Effect.succeed("!"), Effect.withMetric(gauge))),
          Effect.zipRight(pipe(base, Metric.tagged("dyn", "!"), Metric.value))
        )
        deepStrictEqual(result, MetricState.gauge(1))
      }))
  })
  describe("Histogram", () => {
    it.effect("custom observe as aspect", () =>
      Effect.gen(function*() {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const histogram = pipe(Metric.histogram(name, boundaries), Metric.taggedWithLabels(labels))
        const result = yield* pipe(
          Effect.succeed(1),
          Effect.withMetric(histogram),
          Effect.zipRight(pipe(Effect.succeed(3), Effect.withMetric(histogram))),
          Effect.zipRight(Metric.value(histogram))
        )
        strictEqual(result.count, 2)
        strictEqual(result.sum, 4)
        strictEqual(result.min, 1)
        strictEqual(result.max, 3)
      }))

    it.effect("direct observe", () =>
      Effect.gen(function*() {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const histogram = pipe(Metric.histogram(name, boundaries), Metric.taggedWithLabels(labels))
        const result = yield* pipe(
          histogram,
          Metric.update(1),
          Effect.zipRight(pipe(histogram, Metric.update(3))),
          Effect.zipRight(Metric.value(histogram))
        )
        strictEqual(result.count, 2)
        strictEqual(result.sum, 4)
        strictEqual(result.min, 1)
        strictEqual(result.max, 3)
      }))

    it.live("histogram with sleeps", () =>
      it.flakyTest(
        Effect.gen(function*() {
          const name = nextName()
          const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
          const histogram = pipe(
            Metric.histogram(name, boundaries),
            Metric.taggedWithLabels(labels),
            Metric.mapInput((duration: Duration.Duration) => Duration.toMillis(duration) / 1000)
          )
          // NOTE: trackDuration always uses the **real** Clock
          const start = yield* Effect.sync(() => Date.now())
          yield* pipe(Effect.sleep(Duration.millis(100)), Metric.trackDuration(histogram))
          yield* pipe(Effect.sleep(Duration.millis(300)), Metric.trackDuration(histogram))
          const end = yield* Effect.sync(() => Date.now())
          const elapsed = end - start
          const result = yield* Metric.value(histogram)
          strictEqual(result.count, 2)
          assertTrue(result.sum > 0.39)
          assertTrue(result.sum <= elapsed)
          assertTrue(result.min >= 0.1)
          assertTrue(result.min < result.max)
          assertTrue(result.max >= 0.3)
          assertTrue(result.max < elapsed)
        })
      ))

    it.effect("custom observe with mapInput", () =>
      Effect.gen(function*() {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const histogram = pipe(
          Metric.histogram(name, boundaries),
          Metric.taggedWithLabels(labels),
          Metric.mapInput((s: string) => s.length)
        )
        const result = yield* pipe(
          Effect.succeed("x"),
          Effect.withMetric(histogram),
          Effect.zipRight(pipe(Effect.succeed("xyz"), Effect.withMetric(histogram))),
          Effect.zipRight(Metric.value(histogram))
        )
        strictEqual(result.count, 2)
        strictEqual(result.sum, 4)
        strictEqual(result.min, 1)
        strictEqual(result.max, 3)
      }))

    it.effect("observe + taggedWith", () =>
      Effect.gen(function*() {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const base = pipe(
          Metric.histogram(name, boundaries),
          Metric.taggedWithLabels(labels),
          Metric.mapInput((s: string) => s.length)
        )
        const histogram = base.pipe(
          Metric.taggedWithLabelsInput((input: string) => [MetricLabel.make("dyn", input)])
        )
        const { result1, result2, result3 } = yield* pipe(
          Effect.succeed("x"),
          Effect.withMetric(histogram),
          Effect.zipRight(pipe(Effect.succeed("xyz"), Effect.withMetric(histogram))),
          Effect.zipRight(Effect.all({
            result1: Metric.value(base),
            result2: pipe(base, Metric.tagged("dyn", "x"), Metric.value),
            result3: pipe(base, Metric.tagged("dyn", "xyz"), Metric.value)
          }))
        )
        strictEqual(result1.count, 0)
        strictEqual(result2.count, 1)
        strictEqual(result3.count, 1)
      }))

    it.effect("preserves precision of boundary values", () =>
      Effect.gen(function*() {
        const preciseBoundaries = [0.005, 0.01, 0.025, 0.05, 0.075, 0.1]

        const histogram = Metric.histogram(
          "precision_test",
          MetricBoundaries.fromIterable(preciseBoundaries)
        )

        const result = yield* Metric.value(histogram)

        result.buckets.forEach(([boundary], index) => {
          if (index < preciseBoundaries.length) {
            strictEqual(boundary, preciseBoundaries[index])
          }
        })
      }))
  })

  describe("Summary", () => {
    it.effect("custom observe as aspect", () =>
      Effect.gen(function*() {
        const name = nextName()
        const summary = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 10,
          error: 0,
          quantiles: [0.25, 0.5, 0.75]
        }).pipe(
          Metric.taggedWithLabels(labels)
        )
        const result = yield* pipe(
          Effect.succeed(1),
          Effect.withMetric(summary),
          Effect.zipRight(pipe(Effect.succeed(3), Effect.withMetric(summary))),
          Effect.zipRight(Metric.value(summary))
        )
        strictEqual(result.count, 2)
        strictEqual(result.sum, 4)
        strictEqual(result.min, 1)
        strictEqual(result.max, 3)
        const medianQuantileValue = result.quantiles[1][1]
        strictEqual(Option.getOrNull(medianQuantileValue), 1)
      }))
    it.effect("direct observe", () =>
      Effect.gen(function*() {
        const name = nextName()
        const summary = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 10,
          error: 0,
          quantiles: [0.25, 0.5, 0.75]
        }).pipe(
          Metric.taggedWithLabels(labels)
        )
        const result = yield* pipe(
          summary,
          Metric.update(1),
          Effect.zipRight(pipe(summary, Metric.update(3))),
          Effect.zipRight(Metric.value(summary))
        )
        strictEqual(result.count, 2)
        strictEqual(result.sum, 4)
        strictEqual(result.min, 1)
        strictEqual(result.max, 3)
        const medianQuantileValue = result.quantiles[1][1]
        strictEqual(Option.getOrNull(medianQuantileValue), 1)
      }))
    it.effect("custom observe with mapInput", () =>
      Effect.gen(function*() {
        const name = nextName()
        const summary = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 10,
          error: 0,
          quantiles: [0.25, 0.5, 0.75]
        }).pipe(
          Metric.taggedWithLabels(labels),
          Metric.mapInput((s: string) => s.length)
        )
        const result = yield* pipe(
          Effect.succeed("x"),
          Effect.withMetric(summary),
          Effect.zipRight(pipe(Effect.succeed("xyz"), Effect.withMetric(summary))),
          Effect.zipRight(Metric.value(summary))
        )
        strictEqual(result.count, 2)
        strictEqual(result.sum, 4)
        strictEqual(result.min, 1)
        strictEqual(result.max, 3)
        const medianQuantileValue = result.quantiles[1][1]
        strictEqual(Option.getOrNull(medianQuantileValue), 1)
      }))
    it.effect("observeSummaryWith + taggedWith", () =>
      Effect.gen(function*() {
        const name = nextName()
        const base = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 10,
          error: 0,
          quantiles: [0.25, 0.5, 0.75]
        }).pipe(
          Metric.taggedWithLabels(labels),
          Metric.mapInput((s: string) => s.length)
        )
        const summary = base.pipe(
          Metric.taggedWithLabelsInput((input: string) => [MetricLabel.make("dyn", input)])
        )
        const { result1, result2, result3 } = yield* pipe(
          Effect.succeed("x"),
          Effect.withMetric(summary),
          Effect.zipRight(pipe(Effect.succeed("xyz"), Effect.withMetric(summary))),
          Effect.zipRight(Effect.all({
            result1: Metric.value(base),
            result2: pipe(base, Metric.tagged("dyn", "x"), Metric.value),
            result3: pipe(base, Metric.tagged("dyn", "xyz"), Metric.value)
          }))
        )
        strictEqual(result1.count, 0)
        strictEqual(result2.count, 1)
        strictEqual(result3.count, 1)
      }))
    it.effect("should return correct quantile when first chunk overshoots", () =>
      Effect.gen(function*() {
        const name = nextName()
        // Samples: [10 (x6), 20, 30, 40, 50] (10 samples)
        // Target rank for 0.5 quantile = 0.5 * 10 = 5
        // Allowed error = (0.01 / 2) * 5 = 0.025. Range [4.975, 5.025]
        // First chunk: 6 * 10. candConsumed = 6. 6 > 5.025
        const samples = [10, 10, 10, 10, 10, 10, 20, 30, 40, 50]
        const summary = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 15,
          error: 0.01,
          quantiles: [0.5]
        })

        yield* Effect.forEach(samples, (value) => Metric.update(summary, value), { discard: true })

        const result = yield* Metric.value(summary)

        const medianQuantileValue = result.quantiles[0][1]

        strictEqual(Option.getOrNull(medianQuantileValue), 10)
      }))
    it.effect("should return no values when no samples are present", () =>
      Effect.gen(function*() {
        const name = nextName()
        const summary = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 15,
          error: 0.01,
          quantiles: [0.5]
        })

        const result = yield* Metric.value(summary)

        const medianQuantileValue = result.quantiles[0][1]
        const minValue = result.min
        const maxValue = result.max
        const countValue = result.count
        const sumValue = result.sum

        strictEqual(Option.isNone(medianQuantileValue), true)
        strictEqual(minValue, 0)
        strictEqual(maxValue, 0)
        strictEqual(countValue, 0)
        strictEqual(sumValue, 0)
      }))
  })
  describe("Polling", () => {
    it.scopedLive("launch should be interruptible", () =>
      Effect.gen(function*() {
        const name = yield* pipe(Clock.currentTimeMillis, Effect.map((now) => `gauge-${now}`))
        const [gauge, metric] = makePollingGauge(name, 1)
        const schedule = pipe(Schedule.forever, Schedule.delayed(() => Duration.millis(250)))
        const fiber = yield* pipe(metric, MetricPolling.launch(schedule))
        yield* Fiber.interrupt(fiber)
        const result = yield* Metric.value(gauge)
        strictEqual(result.value, 0)
      }))
    it.scoped("launch should update the internal metric using the provided Schedule", () =>
      Effect.gen(function*() {
        const name = yield* pipe(Clock.currentTimeMillis, Effect.map((now) => `gauge-${now}`))
        const [gauge, metric] = makePollingGauge(name, 1)
        const fiber = yield* pipe(metric, MetricPolling.launch(Schedule.once))
        yield* Fiber.join(fiber)
        const result = yield* Metric.value(gauge)
        strictEqual(result.value, 1)
      }))
    it.scoped("collectAll should generate a metric that polls all the provided metrics", () =>
      Effect.gen(function*() {
        const gaugeIncrement1 = 1
        const gaugeIncrement2 = 2
        const pollingCount = 2
        const name1 = yield* pipe(Clock.currentTimeMillis, Effect.map((now) => `gauge1-${now}`))
        const name2 = yield* pipe(Clock.currentTimeMillis, Effect.map((now) => `gauge2-${now}`))
        const [gauge1, metric1] = makePollingGauge(name1, gaugeIncrement1)
        const [gauge2, metric2] = makePollingGauge(name2, gaugeIncrement2)
        const metric = MetricPolling.collectAll([metric1, metric2])
        const fiber = yield* pipe(metric, MetricPolling.launch(Schedule.recurs(pollingCount)))
        yield* Fiber.join(fiber)
        const result1 = yield* Metric.value(gauge1)
        const result2 = yield* Metric.value(gauge2)
        strictEqual(result1.value, gaugeIncrement1 * pollingCount)
        strictEqual(result2.value, gaugeIncrement2 * pollingCount)
      }))
  })

  it.effect("with a description", () =>
    Effect.gen(function*() {
      const name = "counterName"
      const counter1 = Metric.counter(name)
      const counter2 = Metric.counter(name, { description: "description1" })
      const counter3 = Metric.counter(name, { description: "description2" })

      yield* (Metric.update(counter1, 1))
      yield* (Metric.update(counter2, 1))
      yield* (Metric.update(counter3, 1))

      const result1 = yield* (Metric.value(counter1))
      const result2 = yield* (Metric.value(counter2))
      const result3 = yield* (Metric.value(counter3))

      const snapshot = yield* (Metric.snapshot)
      const pair1 = yield* (
        Array.findFirst(snapshot, (key) => Equal.equals(key.metricKey, MetricKey.counter(name)))
      )
      const pair2 = yield* (
        Array.findFirst(snapshot, (key) =>
          Equal.equals(
            key.metricKey,
            MetricKey.counter(name, {
              description: "description1"
            })
          ))
      )
      const pair3 = yield* (
        Array.findFirst(snapshot, (key) =>
          Equal.equals(
            key.metricKey,
            MetricKey.counter(name, {
              description: "description2"
            })
          ))
      )

      assertTrue(Equal.equals(result1, MetricState.counter(1)))
      assertTrue(Equal.equals(result2, MetricState.counter(1)))
      assertTrue(Equal.equals(result3, MetricState.counter(1)))
      assertTrue(Equal.equals(pair1.metricState, MetricState.counter(1)))
      assertTrue(Option.isNone(pair1.metricKey.description))
      assertTrue(Equal.equals(pair2.metricState, MetricState.counter(1)))
      assertTrue(Equal.equals(
        pair2.metricKey,
        MetricKey.counter(name, {
          description: "description1"
        })
      ))
      assertTrue(Equal.equals(pair3.metricState, MetricState.counter(1)))
      assertTrue(Equal.equals(
        pair3.metricKey,
        MetricKey.counter(name, {
          description: "description2"
        })
      ))
    }))

  it.effect(".register()", () =>
    Effect.gen(function*() {
      const id = nextName()
      Metric.counter(id).register()
      const snapshot = yield* (Metric.snapshot)
      const value = pipe(
        Array.fromIterable(snapshot),
        Array.findFirst((_) => _.metricKey.name === id)
      )
      strictEqual(value._tag, "Some")
    }))
  describe("trackSuccessWith", () => {
    it.effect("infers types in Effectful pipes", () => {
      const counter = Metric.counter("counter")
      const frequency = Metric.frequency("frequency")
      const gauge = Metric.gauge("gauge")
      const histogram = Metric.histogram(
        "histogram",
        MetricBoundaries.linear({ start: 0, width: 10, count: 11 })
      )
      const summary = Metric.summary({
        name: "summary",
        maxAge: Duration.minutes(1),
        maxSize: 10,
        error: 0,
        quantiles: [0.25, 0.5, 1]
      })
      return Effect.Do.pipe(
        Effect.let("step1", () => 1),
        Metric.trackSuccessWith(counter, ({ step1 }) => step1),
        Effect.let("someThingElse", () => ({ a: 3 })),
        Metric.trackSuccessWith(gauge, ({ step1 }) => step1),
        Metric.trackSuccessWith(histogram, ({ step1 }) => step1),
        Effect.let("anotherPartOfTheState", () => ({ b: "seven" })),
        Metric.trackSuccessWith(summary, ({ step1 }) => step1),
        Effect.let("step2", () => 4),
        Effect.let("step3", () => "foo"),
        Metric.trackSuccessWith(counter, ({ step2 }) => step2),
        Effect.let("irrelevant", () => "irrelevant"),
        Metric.trackSuccessWith(gauge, ({ step2 }) => step2),
        Metric.trackSuccessWith(histogram, ({ step2 }) => step2),
        Effect.let("moreIrrelevant", () => "moreIrrelevant"),
        Metric.trackSuccessWith(summary, ({ step2 }) => step2),
        Effect.let("otherStuff", () => ({ x: "otherStuff" })),
        Metric.trackSuccessWith(frequency, ({ step3 }) => step3),
        Effect.let("step4", () => "bar"),
        Metric.trackSuccessWith(frequency, ({ step4 }) => step4),
        Effect.bind("results", () =>
          Effect.all({
            counter: Metric.value(counter),
            gauge: Metric.value(gauge),
            histogram: Metric.value(histogram),
            summary: Metric.value(summary),
            frequency: Metric.value(frequency)
          }))
      ).pipe(
        Effect.map(({ results }) => {
          deepStrictEqual(results.counter, MetricState.counter(5))
          deepStrictEqual(results.gauge, MetricState.gauge(4))
          strictEqual(results.histogram.count, 2)
          strictEqual(results.histogram.sum, 5)
          strictEqual(results.histogram.min, 1)
          strictEqual(results.histogram.max, 4)
          strictEqual(results.summary.count, 2)
          strictEqual(results.summary.sum, 5)
          strictEqual(results.summary.min, 1)
          strictEqual(results.summary.max, 4)
          deepStrictEqual(results.summary.quantiles.map((x) => x[1]).map(Option.getOrNull), [1, 1, 4])
          deepStrictEqual(
            results.frequency.occurrences,
            new Map([
              ["bar", 1],
              ["foo", 1]
            ])
          )
        })
      )
    })
  })
})
