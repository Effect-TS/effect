import * as it from "effect-test/utils/extend"
import * as Chunk from "effect/Chunk"
import * as Clock from "effect/Clock"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Metric from "effect/Metric"
import * as MetricBoundaries from "effect/MetricBoundaries"
import * as MetricKey from "effect/MetricKey"
import * as MetricLabel from "effect/MetricLabel"
import * as PollingMetric from "effect/MetricPolling"
import * as MetricState from "effect/MetricState"
import * as Option from "effect/Option"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Schedule from "effect/Schedule"
import { assert, describe, expect } from "vitest"

const labels = Chunk.make(MetricLabel.make("x", "a"), MetricLabel.make("y", "b"))

const makePollingGauge = (name: string, increment: number) => {
  const gauge = Metric.gauge(name)
  const metric = PollingMetric.make(gauge, Metric.value(gauge).pipe(Effect.map((gauge) => gauge.value + increment)))
  return [gauge, metric] as const
}

let nameCount = 0
const nextName = () => `m${++nameCount}`

describe.concurrent("Metric", () => {
  describe.concurrent("Counter", () => {
    it.effect("custom increment as aspect", () =>
      Effect.gen(function*($) {
        const id = nextName()
        const counter = Metric.counter(id).pipe(Metric.taggedWithLabels(labels), Metric.withConstantInput(1))
        const result = yield* $(
          counter(Effect.unit).pipe(Effect.zipRight(counter(Effect.unit)), Effect.zipRight(Metric.value(counter)))
        )
        assert.deepStrictEqual(result, MetricState.counter(2))
      }))
    it.effect("direct increment", () =>
      Effect.gen(function*($) {
        const id = nextName()
        const counter = Metric.counter(id).pipe(Metric.taggedWithLabels(labels))
        const result = yield* $(
          Metric.increment(counter).pipe(
            Effect.zipRight(Metric.increment(counter)),
            Effect.zipRight(Metric.value(counter))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(2))
      }))

    it.effect("direct increment bigint", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const counter = Metric.counter(name, {
          bigint: true
        }).pipe(Metric.taggedWithLabels(labels))
        const result = yield* $(
          Metric.increment(counter).pipe(
            Effect.zipRight(Metric.increment(counter)),
            Effect.zipRight(Metric.value(counter))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(BigInt(2)))
      }))

    it.effect("cannot decrement incremental", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const counter = Metric.counter(name, { incremental: true }).pipe(Metric.taggedWithLabels(labels))
        const result = yield* $(
          Metric.increment(counter).pipe(
            Effect.zipRight(Metric.increment(counter)),
            Effect.zipRight(Metric.incrementBy(counter, -1)),
            Effect.zipRight(Metric.value(counter))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(2))
      }))

    it.effect("cannot decrement incremental bigint", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const counter = Metric.counter(name, {
          incremental: true,
          bigint: true
        }).pipe(Metric.taggedWithLabels(labels))
        const result = yield* $(
          Metric.increment(counter).pipe(
            Effect.zipRight(Metric.increment(counter)),
            Effect.zipRight(Metric.incrementBy(counter, BigInt(-1))),
            Effect.zipRight(Metric.value(counter))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(BigInt(2)))
      }))

    it.effect("custom increment by value as aspect", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const counter = Metric.counter(name).pipe(Metric.taggedWithLabels(labels))
        const result = yield* $(
          counter(Effect.succeed(10)).pipe(
            Effect.zipRight(counter(Effect.succeed(5))),
            Effect.zipRight(Metric.value(counter))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(15))
      }))

    it.effect("custom increment by bigint value as aspect", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const counter = Metric.counter(name, { bigint: true }).pipe(Metric.taggedWithLabels(labels))
        const result = yield* $(
          counter(Effect.succeed(BigInt(10))).pipe(
            Effect.zipRight(counter(Effect.succeed(BigInt(5)))),
            Effect.zipRight(Metric.value(counter))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(BigInt(15)))
      }))

    it.effect("direct increment referential transparency", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const result = yield* $(
          pipe(
            Effect.unit,
            Effect.withMetric(
              Metric.counter(name).pipe(
                Metric.taggedWithLabels(labels),
                Metric.withConstantInput(1)
              )
            ),
            Effect.zipRight(
              pipe(
                Effect.unit,
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
        )
        assert.deepStrictEqual(result, MetricState.counter(2))
      }))
    it.effect("custom increment referential transparency", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const result = yield* $(
          pipe(
            Effect.succeed(10),
            Effect.withMetric(pipe(Metric.counter(name), Metric.taggedWithLabels(labels))),
            Effect.zipRight(
              pipe(Effect.succeed(5), Effect.withMetric(pipe(Metric.counter(name), Metric.taggedWithLabels(labels))))
            ),
            Effect.zipRight(pipe(Metric.counter(name), Metric.taggedWithLabels(labels), Metric.value))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(15))
      }))
    it.effect("custom increment with mapInput", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const result = yield* $(
          pipe(
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
        )
        assert.deepStrictEqual(result, MetricState.counter(6))
      }))
    it.effect("does not count errors", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const counter = pipe(Metric.counter(name), Metric.withConstantInput(1))
        const result = yield* $(
          pipe(
            Effect.unit,
            Effect.withMetric(counter),
            Effect.zipRight(pipe(Effect.fail("error"), Effect.withMetric(counter), Effect.ignore)),
            Effect.zipRight(Metric.value(counter))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(1))
      }))
    it.effect("count + taggedWith", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const base = pipe(Metric.counter(name), Metric.tagged("static", "0"), Metric.withConstantInput(1))
        const counter = pipe(
          base,
          Metric.taggedWithLabelsInput((input: string) => HashSet.make(MetricLabel.make("dyn", input)))
        )
        const result = yield* $(
          pipe(
            Effect.succeed("hello"),
            Effect.withMetric(counter),
            Effect.zipRight(pipe(Effect.succeed("!"), Effect.withMetric(counter))),
            Effect.zipRight(pipe(Effect.succeed("!"), Effect.withMetric(counter))),
            Effect.zipRight(pipe(base, Metric.tagged("dyn", "!"), Metric.value))
          )
        )
        assert.deepStrictEqual(result, MetricState.counter(2))
      }))
    it.effect("tags are a region setting", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const counter = Metric.counter(name)
        const result = yield* $(
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
        assert.deepStrictEqual(result, MetricState.counter(1))
      }))
  })
  describe.concurrent("Frequency", () => {
    it.effect("custom occurrences as aspect", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const frequency = pipe(Metric.frequency(name), Metric.taggedWithLabels(labels))
        const result = yield* $(
          pipe(
            Effect.succeed("hello"),
            Effect.withMetric(frequency),
            Effect.zipRight(pipe(Effect.succeed("hello"), Effect.withMetric(frequency))),
            Effect.zipRight(pipe(Effect.succeed("world"), Effect.withMetric(frequency))),
            Effect.zipRight(Metric.value(frequency))
          )
        )
        assert.deepStrictEqual(result.occurrences, HashMap.make(["hello", 2] as const, ["world", 1] as const))
      }))
    it.effect("direct occurrences", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const frequency = pipe(Metric.frequency(name), Metric.taggedWithLabels(labels))
        const result = yield* $(
          pipe(
            frequency,
            Metric.update("hello"),
            Effect.zipRight(pipe(frequency, Metric.update("hello"))),
            Effect.zipRight(pipe(frequency, Metric.update("world"))),
            Effect.zipRight(Metric.value(frequency))
          )
        )
        assert.deepStrictEqual(result.occurrences, HashMap.make(["hello", 2] as const, ["world", 1] as const))
      }))
    it.effect("custom occurrences with mapInput", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const frequency = pipe(
          Metric.frequency(name),
          Metric.taggedWithLabels(labels),
          Metric.mapInput((n: number) => `${n}`)
        )
        const result = yield* $(
          pipe(
            Effect.succeed(1),
            Effect.withMetric(frequency),
            Effect.zipRight(pipe(Effect.succeed(1), Effect.withMetric(frequency))),
            Effect.zipRight(pipe(Effect.succeed(2), Effect.withMetric(frequency))),
            Effect.zipRight(Metric.value(frequency))
          )
        )
        assert.deepStrictEqual(result.occurrences, HashMap.make(["1", 2] as const, ["2", 1] as const))
      }))
    it.effect("occurences + taggedWith", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const base = pipe(Metric.frequency(name), Metric.taggedWithLabels(labels))
        const frequency = pipe(
          base,
          Metric.taggedWithLabelsInput((s: string) => HashSet.make(MetricLabel.make("dyn", s)))
        )
        const { result1, result2, result3 } = yield* $(
          pipe(
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
        )
        assert.isTrue(HashMap.isEmpty(result1.occurrences))
        assert.deepStrictEqual(result2.occurrences, HashMap.make(["hello", 2] as const))
        assert.deepStrictEqual(result3.occurrences, HashMap.make(["world", 1] as const))
      }))
  })
  describe.concurrent("Gauge", () => {
    it.effect("custom set as aspect", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const gauge = pipe(Metric.gauge(name), Metric.taggedWithLabels(labels))
        const result = yield* $(
          pipe(
            Effect.succeed(1),
            Effect.withMetric(gauge),
            Effect.zipRight(pipe(Effect.succeed(3), Effect.withMetric(gauge))),
            Effect.zipRight(Metric.value(gauge))
          )
        )
        assert.deepStrictEqual(result, MetricState.gauge(3))
      }))
    it.effect("direct set", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const gauge = pipe(Metric.gauge(name), Metric.taggedWithLabels(labels))
        const result = yield* $(
          pipe(gauge, Metric.set(1), Effect.zipRight(pipe(gauge, Metric.set(3))), Effect.zipRight(Metric.value(gauge)))
        )
        assert.deepStrictEqual(result, MetricState.gauge(3))
      }))
    it.effect("custom set with mapInput", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const gauge = pipe(Metric.gauge(name), Metric.taggedWithLabels(labels), Metric.mapInput((n: number) => n * 2))
        const result = yield* $(
          pipe(
            Effect.succeed(1),
            Effect.withMetric(gauge),
            Effect.zipRight(pipe(Effect.succeed(3), Effect.withMetric(gauge))),
            Effect.zipRight(Metric.value(gauge))
          )
        )
        assert.deepStrictEqual(result, MetricState.gauge(6))
      }))
    it.effect("gauge + taggedWith", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const base = pipe(Metric.gauge(name), Metric.tagged("static", "0"), Metric.mapInput((s: string) => s.length))
        const gauge = pipe(
          base,
          Metric.taggedWithLabelsInput((input: string) => HashSet.make(MetricLabel.make("dyn", input)))
        )
        const result = yield* $(
          pipe(
            Effect.succeed("hello"),
            Effect.withMetric(gauge),
            Effect.zipRight(pipe(Effect.succeed("!"), Effect.withMetric(gauge))),
            Effect.zipRight(pipe(Effect.succeed("!"), Effect.withMetric(gauge))),
            Effect.zipRight(pipe(base, Metric.tagged("dyn", "!"), Metric.value))
          )
        )
        assert.deepStrictEqual(result, MetricState.gauge(1))
      }))
  })
  describe.concurrent("Histogram", () => {
    it.effect("custom observe as aspect", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const histogram = pipe(Metric.histogram(name, boundaries), Metric.taggedWithLabels(labels))
        const result = yield* $(
          pipe(
            Effect.succeed(1),
            Effect.withMetric(histogram),
            Effect.zipRight(pipe(Effect.succeed(3), Effect.withMetric(histogram))),
            Effect.zipRight(Metric.value(histogram))
          )
        )
        assert.strictEqual(result.count, 2)
        assert.strictEqual(result.sum, 4)
        assert.strictEqual(result.min, 1)
        assert.strictEqual(result.max, 3)
      }))
    it.effect("direct observe", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const histogram = pipe(Metric.histogram(name, boundaries), Metric.taggedWithLabels(labels))
        const result = yield* $(
          pipe(
            histogram,
            Metric.update(1),
            Effect.zipRight(pipe(histogram, Metric.update(3))),
            Effect.zipRight(Metric.value(histogram))
          )
        )
        assert.strictEqual(result.count, 2)
        assert.strictEqual(result.sum, 4)
        assert.strictEqual(result.min, 1)
        assert.strictEqual(result.max, 3)
      }))
    it.flakyTest(
      Effect.gen(function*($) {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const histogram = pipe(
          Metric.histogram(name, boundaries),
          Metric.taggedWithLabels(labels),
          Metric.mapInput((duration: Duration.Duration) => Duration.toMillis(duration) / 1000)
        )
        // NOTE: trackDuration always uses the **real** Clock
        const start = yield* $(Effect.sync(() => Date.now()))
        yield* $(Effect.sleep(Duration.millis(100)), Metric.trackDuration(histogram))
        yield* $(Effect.sleep(Duration.millis(300)), Metric.trackDuration(histogram))
        const end = yield* $(Effect.sync(() => Date.now()))
        const elapsed = end - start
        const result = yield* $(Metric.value(histogram))
        assert.strictEqual(result.count, 2)
        assert.isAbove(result.sum, 0.39)
        assert.isAtMost(result.sum, elapsed)
        assert.isAtLeast(result.min, 0.1)
        assert.isBelow(result.min, result.max)
        assert.isAtLeast(result.max, 0.3)
        assert.isBelow(result.max, elapsed)
      })
    )
    it.effect("custom observe with mapInput", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const histogram = pipe(
          Metric.histogram(name, boundaries),
          Metric.taggedWithLabels(labels),
          Metric.mapInput((s: string) => s.length)
        )
        const result = yield* $(
          pipe(
            Effect.succeed("x"),
            Effect.withMetric(histogram),
            Effect.zipRight(pipe(Effect.succeed("xyz"), Effect.withMetric(histogram))),
            Effect.zipRight(Metric.value(histogram))
          )
        )
        assert.strictEqual(result.count, 2)
        assert.strictEqual(result.sum, 4)
        assert.strictEqual(result.min, 1)
        assert.strictEqual(result.max, 3)
      }))
    it.effect("observe + taggedWith", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const boundaries = MetricBoundaries.linear({ start: 0, width: 1, count: 10 })
        const base = pipe(
          Metric.histogram(name, boundaries),
          Metric.taggedWithLabels(labels),
          Metric.mapInput((s: string) => s.length)
        )
        const histogram = base.pipe(
          Metric.taggedWithLabelsInput((input: string) => HashSet.make(MetricLabel.make("dyn", input)))
        )
        const { result1, result2, result3 } = yield* $(
          Effect.succeed("x"),
          Effect.withMetric(histogram),
          Effect.zipRight(pipe(Effect.succeed("xyz"), Effect.withMetric(histogram))),
          Effect.zipRight(Effect.all({
            result1: Metric.value(base),
            result2: pipe(base, Metric.tagged("dyn", "x"), Metric.value),
            result3: pipe(base, Metric.tagged("dyn", "xyz"), Metric.value)
          }))
        )
        assert.strictEqual(result1.count, 0)
        assert.strictEqual(result2.count, 1)
        assert.strictEqual(result3.count, 1)
      }))
  })
  describe.concurrent("Summary", () => {
    it.effect("custom observe as aspect", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const summary = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 10,
          error: 0,
          quantiles: Chunk.make(0, 1, 10)
        }).pipe(
          Metric.taggedWithLabels(labels)
        )
        const result = yield* $(
          Effect.succeed(1),
          Effect.withMetric(summary),
          Effect.zipRight(pipe(Effect.succeed(3), Effect.withMetric(summary))),
          Effect.zipRight(Metric.value(summary))
        )
        assert.strictEqual(result.count, 2)
        assert.strictEqual(result.sum, 4)
        assert.strictEqual(result.min, 1)
        assert.strictEqual(result.max, 3)
      }))
    it.effect("direct observe", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const summary = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 10,
          error: 0,
          quantiles: Chunk.make(0, 1, 10)
        }).pipe(
          Metric.taggedWithLabels(labels)
        )
        const result = yield* $(
          summary,
          Metric.update(1),
          Effect.zipRight(pipe(summary, Metric.update(3))),
          Effect.zipRight(Metric.value(summary))
        )
        assert.strictEqual(result.count, 2)
        assert.strictEqual(result.sum, 4)
        assert.strictEqual(result.min, 1)
        assert.strictEqual(result.max, 3)
      }))
    it.effect("custom observe with mapInput", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const summary = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 10,
          error: 0,
          quantiles: Chunk.make(0, 1, 10)
        }).pipe(
          Metric.taggedWithLabels(labels),
          Metric.mapInput((s: string) => s.length)
        )
        const result = yield* $(
          Effect.succeed("x"),
          Effect.withMetric(summary),
          Effect.zipRight(pipe(Effect.succeed("xyz"), Effect.withMetric(summary))),
          Effect.zipRight(Metric.value(summary))
        )
        assert.strictEqual(result.count, 2)
        assert.strictEqual(result.sum, 4)
        assert.strictEqual(result.min, 1)
        assert.strictEqual(result.max, 3)
      }))
    it.effect("observeSummaryWith + taggedWith", () =>
      Effect.gen(function*($) {
        const name = nextName()
        const base = Metric.summary({
          name,
          maxAge: Duration.minutes(1),
          maxSize: 10,
          error: 0,
          quantiles: Chunk.make(0, 1, 10)
        }).pipe(
          Metric.taggedWithLabels(labels),
          Metric.mapInput((s: string) => s.length)
        )
        const summary = base.pipe(
          Metric.taggedWithLabelsInput((input: string) => HashSet.make(MetricLabel.make("dyn", input)))
        )
        const { result1, result2, result3 } = yield* $(
          Effect.succeed("x"),
          Effect.withMetric(summary),
          Effect.zipRight(pipe(Effect.succeed("xyz"), Effect.withMetric(summary))),
          Effect.zipRight(Effect.all({
            result1: Metric.value(base),
            result2: pipe(base, Metric.tagged("dyn", "x"), Metric.value),
            result3: pipe(base, Metric.tagged("dyn", "xyz"), Metric.value)
          }))
        )
        assert.strictEqual(result1.count, 0)
        assert.strictEqual(result2.count, 1)
        assert.strictEqual(result3.count, 1)
      }))
  })
  describe.concurrent("Polling", () => {
    it.scopedLive("launch should be interruptible", () =>
      Effect.gen(function*($) {
        const name = yield* $(Clock.currentTimeMillis, Effect.map((now) => `gauge-${now}`))
        const [gauge, metric] = makePollingGauge(name, 1)
        const schedule = pipe(Schedule.forever, Schedule.delayed(() => Duration.millis(250)))
        const fiber = yield* $(metric, PollingMetric.launch(schedule))
        yield* $(Fiber.interrupt(fiber))
        const result = yield* $(Metric.value(gauge))
        assert.strictEqual(result.value, 0)
      }))
    it.scoped("launch should update the internal metric using the provided Schedule", () =>
      Effect.gen(function*($) {
        const name = yield* $(Clock.currentTimeMillis, Effect.map((now) => `gauge-${now}`))
        const [gauge, metric] = makePollingGauge(name, 1)
        const fiber = yield* $(metric, PollingMetric.launch(Schedule.once))
        yield* $(Fiber.join(fiber))
        const result = yield* $(Metric.value(gauge))
        assert.strictEqual(result.value, 1)
      }))
    it.scoped("collectAll should generate a metric that polls all the provided metrics", () =>
      Effect.gen(function*($) {
        const gaugeIncrement1 = 1
        const gaugeIncrement2 = 2
        const pollingCount = 2
        const name1 = yield* $(Clock.currentTimeMillis, Effect.map((now) => `gauge1-${now}`))
        const name2 = yield* $(Clock.currentTimeMillis, Effect.map((now) => `gauge2-${now}`))
        const [gauge1, metric1] = makePollingGauge(name1, gaugeIncrement1)
        const [gauge2, metric2] = makePollingGauge(name2, gaugeIncrement2)
        const metric = PollingMetric.collectAll([metric1, metric2])
        const fiber = yield* $(metric, PollingMetric.launch(Schedule.recurs(pollingCount)))
        yield* $(Fiber.join(fiber))
        const result1 = yield* $(Metric.value(gauge1))
        const result2 = yield* $(Metric.value(gauge2))
        assert.strictEqual(result1.value, gaugeIncrement1 * pollingCount)
        assert.strictEqual(result2.value, gaugeIncrement2 * pollingCount)
      }))
  })

  it.effect("with a description", () =>
    Effect.gen(function*(_) {
      const name = "counterName"
      const counter1 = Metric.counter(name)
      const counter2 = Metric.counter(name, { description: "description1" })
      const counter3 = Metric.counter(name, { description: "description2" })

      yield* _(Metric.update(counter1, 1))
      yield* _(Metric.update(counter2, 1))
      yield* _(Metric.update(counter3, 1))

      const result1 = yield* _(Metric.value(counter1))
      const result2 = yield* _(Metric.value(counter2))
      const result3 = yield* _(Metric.value(counter3))

      const snapshot = yield* _(Metric.snapshot)
      const values = Array.from(snapshot)
      const pair1 = yield* _(
        ReadonlyArray.findFirst(values, (key) => Equal.equals(key.metricKey, MetricKey.counter(name)))
      )
      const pair2 = yield* _(
        ReadonlyArray.findFirst(values, (key) =>
          Equal.equals(
            key.metricKey,
            MetricKey.counter(name, {
              description: "description1"
            })
          ))
      )
      const pair3 = yield* _(
        ReadonlyArray.findFirst(values, (key) =>
          Equal.equals(
            key.metricKey,
            MetricKey.counter(name, {
              description: "description2"
            })
          ))
      )

      expect(Equal.equals(result1, MetricState.counter(1))).toBe(true)
      expect(Equal.equals(result2, MetricState.counter(1))).toBe(true)
      expect(Equal.equals(result3, MetricState.counter(1))).toBe(true)
      expect(Equal.equals(pair1.metricState, MetricState.counter(1))).toBe(true)
      expect(Option.isNone(pair1.metricKey.description)).toBe(true)
      expect(Equal.equals(pair2.metricState, MetricState.counter(1))).toBe(true)
      expect(Equal.equals(
        pair2.metricKey,
        MetricKey.counter(name, {
          description: "description1"
        })
      )).toBe(true)
      expect(Equal.equals(pair3.metricState, MetricState.counter(1))).toBe(true)
      expect(Equal.equals(
        pair3.metricKey,
        MetricKey.counter(name, {
          description: "description2"
        })
      )).toBe(true)
    }))
})
