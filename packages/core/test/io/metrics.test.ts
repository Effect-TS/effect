import { Chunk } from "../../src/collection/immutable/Chunk"
import { Tuple } from "../../src/collection/immutable/Tuple"
import { Duration } from "../../src/data/Duration"
import { Option } from "../../src/data/Option"
import { Effect } from "../../src/io/Effect"
import { Counter } from "../../src/io/Metrics/Counter"
import { Gauge } from "../../src/io/Metrics/Gauge"
import { Boundaries, Histogram } from "../../src/io/Metrics/Histogram"
import { Metric } from "../../src/io/Metrics/Metric"
import { MetricClient } from "../../src/io/Metrics/MetricClient"
import { MetricKey } from "../../src/io/Metrics/MetricKey"
import { MetricLabel } from "../../src/io/Metrics/MetricLabel"
import { MetricType } from "../../src/io/Metrics/MetricType"
import { SetCount } from "../../src/io/Metrics/SetCount"
import { Summary } from "../../src/io/Metrics/Summary"

const labels = Chunk(MetricLabel("x", "a"), MetricLabel("y", "b"))

describe("Metrics", () => {
  describe("Counter", () => {
    it("custom increment as aspect", async () => {
      const counter = Counter<any>(
        "c1",
        labels,
        (metric) => (effect) => effect.tap(() => metric.increment())
      )

      const program = Effect.unit
        .apply(counter.apply)
        .tap(() => Effect.unit.apply(counter.apply))
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c1", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(2)))
    })

    it("direct increment", async () => {
      const counter = Counter<any>("c2", labels, () => (effect) => effect)

      const program = counter
        .increment()
        .flatMap(() => counter.increment())
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c2", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(2)))
    })

    it("custom increment by value as aspect", async () => {
      const counter = Counter<number>(
        "c3",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.increment(n))
      )

      const program = Effect.succeed(10)
        .apply(counter.apply)
        .flatMap(() => Effect.succeed(5).apply(counter.apply))
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c3", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(15)))
    })

    it("direct increment by value", async () => {
      const counter = Counter<number>("c4", labels, () => (effect) => effect)

      const program = counter
        .increment(10)
        .flatMap(() => counter.increment(5))
        .flatMap(() => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map((snapshots) =>
          snapshots
            .get(MetricKey.Counter("c3", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(15)))
    })

    it("count", async () => {
      const program = Effect.Do()
        .tap(() => Effect.unit.apply(Metric.count("c5", ...labels).apply))
        .tap(() => Effect.unit.apply(Metric.count("c5", ...labels).apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c5", labels))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => Metric.count("c5", ...labels).count())

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(2)))
      expect(value).toEqual(2)
    })

    it("countValue", async () => {
      const program = Effect.Do()
        .tap(() => Effect.succeed(10).apply(Metric.countValue("c6", ...labels).apply))
        .tap(() => Effect.succeed(5).apply(Metric.countValue("c6", ...labels).apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c6", labels))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => Metric.count("c6", ...labels).count())

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(15)))
      expect(value).toEqual(15)
    })

    it("countValueWith", async () => {
      const counter = Metric.countValueWith("c7", ...labels)((s: string) => s.length)
      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(counter.apply))
        .tap(() => Effect.succeed("!").apply(counter.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c7", labels))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => Metric.count("c7", ...labels).count())

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(6)))
      expect(value).toEqual(6)
    })

    it("countErrors", async () => {
      const counter = Metric.countErrors("c8")
      const program = Effect.Do()
        .tap(() =>
          (
            Effect.unit.apply(counter.apply) > Effect.fail("error").apply(counter.apply)
          ).ignore()
        )
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots.get(MetricKey.Counter("c8")).map((snapshot) => snapshot.details)
        )
        .bind("value", () => counter.count())

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(1)))
      expect(value).toEqual(1)
    })

    it("countValueWith + copy", async () => {
      const counter = Metric.countValueWith(
        "c9",
        ...labels
      )((s: string) => s.length).copy({ name: "c9c", tags: Chunk.empty() })
      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(counter.apply))
        .tap(() => Effect.succeed("!").apply(counter.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c9", labels))
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c9c", Chunk.empty()))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => counter.count())

      const { result0, result1, value } = await program.unsafeRunPromise()

      expect(result0).toEqual(Option.some(MetricType.Counter(0)))
      expect(result1).toEqual(Option.some(MetricType.Counter(6)))
      expect(value).toEqual(6)
      expect(counter.name).toEqual("c9c")
    })

    it("count + taggedWith", async () => {
      const counter = Metric.count("c10", MetricLabel("static", "0")).taggedWith((a) =>
        typeof a === "string" ? Chunk.single(MetricLabel("dyn", a)) : Chunk.empty()
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(counter.apply))
        .tap(() => Effect.succeed("!").apply(counter.apply))
        .tap(() => Effect.succeed("!").apply(counter.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Counter(
                "c10",
                Chunk(MetricLabel("static", "0"), MetricLabel("dyn", "!"))
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Counter(2)))
    })

    it("count + taggedWith referential transparency", async () => {
      const counter1 = Metric.count("c11", MetricLabel("static", "0"))
      const counter2 = counter1.taggedWith((a) =>
        typeof a === "string" ? Chunk.single(MetricLabel("dyn", a)) : Chunk.empty()
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed("!").apply(counter2.apply))
        .tap(() => Effect.succeed("hello").apply(counter1.apply))
        .tap(() => Effect.succeed("!").apply(counter1.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Counter("c11", Chunk(MetricLabel("static", "0"))))
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Counter(
                "c11",
                Chunk(MetricLabel("static", "0"), MetricLabel("dyn", "!"))
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toEqual(Option.some(MetricType.Counter(2)))
      expect(result2).toEqual(Option.some(MetricType.Counter(1)))
    })
  })

  describe("Gauge", () => {
    it("custom set as aspect", async () => {
      const gauge = Gauge<number>(
        "g1",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.set(n))
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(gauge.apply))
        .tap(() => Effect.succeed(3).apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g1", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(3)))
    })

    it("direct increment", async () => {
      const gauge = Gauge<number>(
        "g2",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.set(n))
      )

      const program = Effect.Do()
        .tap(() => gauge.set(1))
        .tap(() => gauge.set(3))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g2", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(3)))
    })

    it("custom adjust as aspect", async () => {
      const gauge = Gauge<number>(
        "g3",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.adjust(n))
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed(10).apply(gauge.apply))
        .tap(() => Effect.succeed(5).apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g3", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(15)))
    })

    it("direct adjust", async () => {
      const gauge = Gauge<number>(
        "g4",
        labels,
        (metric) => (effect) => effect.tap((n) => metric.adjust(n))
      )

      const program = Effect.Do()
        .tap(() => gauge.adjust(10))
        .tap(() => gauge.adjust(5))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g4", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(15)))
    })

    it("setGauge", async () => {
      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(Metric.setGauge("g5", ...labels).apply))
        .tap(() => Effect.succeed(3).apply(Metric.setGauge("g5", ...labels).apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g5", labels))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => Metric.setGauge("g5", ...labels).value())

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(3)))
      expect(value).toBe(3)
    })

    it("adjustGauge", async () => {
      const program = Effect.Do()
        .tap(() => Effect.succeed(10).apply(Metric.adjustGauge("g6", ...labels).apply))
        .tap(() => Effect.succeed(5).apply(Metric.adjustGauge("g6", ...labels).apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g6", labels))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => Metric.adjustGauge("g6", ...labels).value())

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(15)))
      expect(value).toBe(15)
    })

    it("setGaugeWith", async () => {
      const gauge = Metric.setGaugeWith("g7", ...labels)((n: number) => n + 1)

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(gauge.apply))
        .tap(() => Effect.succeed(3).apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g7", labels))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => gauge.value())

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(4)))
      expect(value).toBe(4)
    })

    it("adjustGaugeWith", async () => {
      const gauge = Metric.adjustGaugeWith("g8", ...labels)((n: number) => n + 1)

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(gauge.apply))
        .tap(() => Effect.succeed(3).apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g8", labels))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => gauge.value())

      const { result, value } = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(6)))
      expect(value).toBe(6)
    })

    it("adjustGaugeWith + copy", async () => {
      const gauge = Metric.adjustGaugeWith(
        "g9",
        ...labels
      )((s: string) => s.length).copy({ name: "g9c", tags: Chunk.empty() })

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(gauge.apply))
        .tap(() => Effect.succeed("!").apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g9", labels))
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g9c", Chunk.empty()))
            .map((snapshot) => snapshot.details)
        )
        .bind("value", () => gauge.value())

      const { result0, result1, value } = await program.unsafeRunPromise()

      expect(result0).toEqual(Option.some(MetricType.Gauge(0)))
      expect(result1).toEqual(Option.some(MetricType.Gauge(6)))
      expect(value).toBe(6)
      expect(gauge.name).toBe("g9c")
    })

    it("adjustGaugeWith + taggedWith", async () => {
      const gauge = Metric.adjustGaugeWith(
        "g10",
        MetricLabel("static", "0")
      )((s: string) => s.length).taggedWith((s) => Chunk.single(MetricLabel("dyn", s)))

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(gauge.apply))
        .tap(() => Effect.succeed("!").apply(gauge.apply))
        .tap(() => Effect.succeed("!").apply(gauge.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Gauge(
                "g10",
                Chunk(MetricLabel("static", "0"), MetricLabel("dyn", "!"))
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(MetricType.Gauge(2)))
    })

    it("adjustGaugeWith + taggedWith referential transparency", async () => {
      const gauge1 = Metric.adjustGaugeWith(
        "g11",
        MetricLabel("static", "0")
      )((s: string) => s.length)
      const gauge2 = gauge1.taggedWith((s) => Chunk.single(MetricLabel("dyn", s)))

      const program = Effect.Do()
        .tap(() => Effect.succeed("!").apply(gauge2.apply))
        .tap(() => Effect.succeed("hello").apply(gauge1.apply))
        .tap(() => Effect.succeed("!").apply(gauge1.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Gauge("g11", Chunk(MetricLabel("static", "0"))))
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Gauge(
                "g11",
                Chunk(MetricLabel("static", "0"), MetricLabel("dyn", "!"))
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const { result0, result1 } = await program.unsafeRunPromise()

      expect(result0).toEqual(Option.some(MetricType.Gauge(6)))
      expect(result1).toEqual(Option.some(MetricType.Gauge(1)))
    })
  })

  describe("Histogram", () => {
    it("custom observe as aspect", async () => {
      const histogram = Histogram<number>(
        "h1",
        Boundaries.linear(0, 1, 10),
        labels,
        (metric) => (effect) => effect.tap((n) => metric.observe(n))
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(histogram.apply))
        .tap(() => Effect.succeed(3).apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.Histogram).count).toEqual(2)
      expect((result.value as MetricType.Histogram).sum).toEqual(4)
    })

    it("direct observe", async () => {
      const histogram = Histogram<number>(
        "h2",
        Boundaries.linear(0, 1, 10),
        labels,
        () => (effect) => effect
      )

      const program = Effect.Do()
        .tap(() => histogram.observe(1))
        .tap(() => histogram.observe(3))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.Histogram).count).toBe(2)
      expect((result.value as MetricType.Histogram).sum).toBe(4)
    })

    it("observeDurations", async () => {
      const histogram = Metric.observeDurations(
        "h3",
        Boundaries.linear(0, 1, 10),
        ...labels
      )((duration) => duration.milliseconds / 1000)

      // NOTE: observeDurations always uses real clock
      const program = Effect.Do()
        .bind("start", () => Effect(Date.now()))
        .tap(() => Effect.sleep(1000).apply(histogram.apply))
        .tap(() => Effect.sleep(3000).apply(histogram.apply))
        .bind("end", () => Effect(Date.now()))
        .bindValue("elapsed", ({ end, start }) => (end - start) / 1000)
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        )

      const { elapsed, result } = await program.unsafeRunPromise()

      expect((result.value as MetricType.Histogram).count).toBe(2)
      expect((result.value as MetricType.Histogram).sum).toBeGreaterThan(3.9)
      expect((result.value as MetricType.Histogram).sum).toBeLessThanOrEqual(elapsed)
    })

    it("observeHistogram", async () => {
      const histogram = Metric.observeHistogram(
        "h4",
        Boundaries.linear(0, 1, 10),
        ...labels
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(histogram.apply))
        .tap(() => Effect.succeed(3).apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.Histogram).count).toBe(2)
      expect((result.value as MetricType.Histogram).sum).toBe(4)
    })

    it("observeHistogramWith", async () => {
      const histogram = Metric.observeHistogramWith(
        "h5",
        Boundaries.linear(0, 1, 10),
        ...labels
      )((s: string) => s.length)

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(histogram.apply))
        .tap(() => Effect.succeed("xyz").apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(histogram.name, histogram.boundaries, histogram.tags)
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.Histogram).count).toBe(2)
      expect((result.value as MetricType.Histogram).sum).toBe(4)
    })

    it("observeHistogram + copy", async () => {
      const histogram = Metric.observeHistogram(
        "h6",
        Boundaries.linear(0, 1, 10),
        ...labels
      ).copy({ name: "h6c", tags: Chunk.empty() })

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(histogram.apply))
        .tap(() => Effect.succeed(3).apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Histogram("h6", histogram.boundaries, labels))
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Histogram("h6c", histogram.boundaries, Chunk.empty()))
            .map((snapshot) => snapshot.details)
        )

      const { result0, result1 } = await program.unsafeRunPromise()

      expect((result0.value as MetricType.Histogram).count).toBe(0)
      expect((result1.value as MetricType.Histogram).count).toBe(2)
      expect((result1.value as MetricType.Histogram).sum).toBe(4)
    })

    it("observeHistogramWith + taggedWith", async () => {
      const boundaries = Boundaries.linear(0, 1, 10)
      const histogram = Metric.observeHistogramWith(
        "h7",
        boundaries,
        ...labels
      )((s: string) => s.length).taggedWith((s) => Chunk.single(MetricLabel("dyn", s)))

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(histogram.apply))
        .tap(() => Effect.succeed("xyz").apply(histogram.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Histogram("h7", boundaries, labels))
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(
                "h7",
                boundaries,
                labels.append(MetricLabel("dyn", "x"))
              )
            )
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(
                "h7",
                boundaries,
                labels.append(MetricLabel("dyn", "xyz"))
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const { result0, result1, result2 } = await program.unsafeRunPromise()

      expect((result0.value as MetricType.Histogram).count).toBe(0)
      expect((result1.value as MetricType.Histogram).count).toBe(1)
      expect((result2.value as MetricType.Histogram).count).toBe(1)
    })

    it("observeHistogramWith + taggedWith referential transparency", async () => {
      const boundaries = Boundaries.linear(0, 1, 10)
      const histogram1 = Metric.observeHistogramWith(
        "h8",
        boundaries,
        ...labels
      )((s: string) => s.length)
      const histogram2 = histogram1.taggedWith((s) =>
        Chunk.single(MetricLabel("dyn", s))
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(histogram2.apply))
        .tap(() => Effect.succeed("xyz").apply(histogram1.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(MetricKey.Histogram("h8", boundaries, labels))
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(
                "h8",
                boundaries,
                labels.append(MetricLabel("dyn", "x"))
              )
            )
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Histogram(
                "h8",
                boundaries,
                labels.append(MetricLabel("dyn", "xyz"))
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const { result0, result1, result2 } = await program.unsafeRunPromise()

      expect((result0.value as MetricType.Histogram).count).toBe(1)
      expect((result1.value as MetricType.Histogram).count).toBe(1)
      expect(result2).toEqual(Option.none)
    })
  })

  describe("Summary", () => {
    it("custom observe as aspect", async () => {
      const summary = Summary<number>(
        "s1",
        10,
        Duration.fromMinutes(1),
        0,
        Chunk(0, 1, 10),
        labels,
        (metric) => (effect) => effect.tap((n) => metric.observe(n))
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(summary.apply))
        .tap(() => Effect.succeed(3).apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary.name,
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                summary.tags
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.Summary).count).toBe(2)
      expect((result.value as MetricType.Summary).sum).toBe(4)
    })

    it("direct observe", async () => {
      const summary = Summary<number>(
        "s2",
        10,
        Duration.fromMinutes(1),
        0,
        Chunk(0, 1, 10),
        labels,
        () => (effect) => effect
      )

      const program = Effect.Do()
        .tap(() => summary.observe(1))
        .tap(() => summary.observe(3))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary.name,
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                summary.tags
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.Summary).count).toBe(2)
      expect((result.value as MetricType.Summary).sum).toBe(4)
    })

    it("observeSummary", async () => {
      const summary = Metric.observeSummary(
        "s3",
        10,
        Duration.fromMinutes(1),
        0,
        Chunk(0, 1, 10),
        ...labels
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed(1).apply(summary.apply))
        .tap(() => Effect.succeed(3).apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary.name,
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                summary.tags
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.Summary).count).toBe(2)
      expect((result.value as MetricType.Summary).sum).toBe(4)
    })

    it("observeSummaryWith", async () => {
      const summary = Metric.observeSummaryWith(
        "s4",
        10,
        Duration.fromMinutes(1),
        0,
        Chunk(0, 1, 10),
        ...labels
      )((s: string) => s.length)

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(summary.apply))
        .tap(() => Effect.succeed("xyz").apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary.name,
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                summary.tags
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.Summary).count).toBe(2)
      expect((result.value as MetricType.Summary).sum).toBe(4)
    })

    it("observeSummaryWith + copy", async () => {
      const summary = Metric.observeSummaryWith(
        "s5",
        10,
        Duration.fromMinutes(1),
        0,
        Chunk(0, 1, 10),
        ...labels
      )((s: string) => s.length).copy({ name: "s5c", tags: Chunk.empty() })

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(summary.apply))
        .tap(() => Effect.succeed("xyz").apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                "s5",
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                labels
              )
            )
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                "s5c",
                summary.maxSize,
                summary.maxAge,
                summary.error,
                summary.quantiles,
                Chunk.empty()
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const { result0, result1 } = await program.unsafeRunPromise()

      expect((result0.value as MetricType.Summary).count).toBe(0)
      expect((result1.value as MetricType.Summary).count).toBe(2)
      expect((result1.value as MetricType.Summary).sum).toBe(4)
    })

    it("observeSummaryWith + taggedWith", async () => {
      const summary0 = Metric.observeSummaryWith(
        "s6",
        10,
        Duration.fromMinutes(1),
        0,
        Chunk(0, 1, 10),
        ...labels
      )((s: string) => s.length)
      const summary = summary0.taggedWith((s) => Chunk.single(MetricLabel("dyn", s)))

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(summary.apply))
        .tap(() => Effect.succeed("xyz").apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels
              )
            )
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels.append(MetricLabel("dyn", "x"))
              )
            )
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels.append(MetricLabel("dyn", "xyz"))
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const { result0, result1, result2 } = await program.unsafeRunPromise()

      expect((result0.value as MetricType.Summary).count).toBe(0)
      expect((result1.value as MetricType.Summary).count).toBe(1)
      expect((result2.value as MetricType.Summary).count).toBe(1)
    })

    it("observeSummaryWith + taggedWith referential transparency", async () => {
      const summary0 = Metric.observeSummaryWith(
        "s7",
        10,
        Duration.fromMinutes(1),
        0,
        Chunk(0, 1, 10),
        ...labels
      )((s: string) => s.length)
      const summary = summary0.taggedWith((s) => Chunk.single(MetricLabel("dyn", s)))

      const program = Effect.Do()
        .tap(() => Effect.succeed("x").apply(summary.apply))
        .tap(() => Effect.succeed("xyz").apply(summary0.apply))
        .tap(() => Effect.succeed("xyz").apply(summary.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .bindValue("result0", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels
              )
            )
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result1", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels.append(MetricLabel("dyn", "x"))
              )
            )
            .map((snapshot) => snapshot.details)
        )
        .bindValue("result2", ({ snapshots }) =>
          snapshots
            .get(
              MetricKey.Summary(
                summary0.name,
                summary0.maxSize,
                summary0.maxAge,
                summary0.error,
                summary0.quantiles,
                labels.append(MetricLabel("dyn", "xyz"))
              )
            )
            .map((snapshot) => snapshot.details)
        )

      const { result0, result1, result2 } = await program.unsafeRunPromise()

      expect((result0.value as MetricType.Summary).count).toBe(1)
      expect((result1.value as MetricType.Summary).count).toBe(1)
      expect((result2.value as MetricType.Summary).count).toBe(1)
    })
  })

  describe("SetCount", () => {
    it("custom observe as aspect", async () => {
      const setCount = SetCount<string>(
        "sc1",
        "tag",
        labels,
        (metric) => (effect) => effect.tap((a) => metric.observe(a))
      )

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply(setCount.apply))
        .tap(() => Effect.succeed("hello").apply(setCount.apply))
        .tap(() => Effect.succeed("world").apply(setCount.apply))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.SetCount("sc1", "tag", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.SetCount).occurrences.toArray()).toEqual([
        Tuple("hello", 2),
        Tuple("world", 1)
      ])
    })

    it("direct observe", async () => {
      const setCount = SetCount<string>("sc2", "tag", labels, () => (effect) => effect)

      const program = Effect.Do()
        .tap(() => setCount.observe("hello"))
        .tap(() => setCount.observe("hello"))
        .tap(() => setCount.observe("world"))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.SetCount("sc2", "tag", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.SetCount).occurrences.toArray()).toEqual([
        Tuple("hello", 2),
        Tuple("world", 1)
      ])
    })

    it("occurrences", async () => {
      const setCount = Metric.occurrences("sc3", "tag", ...labels)

      const program = Effect.Do()
        .tap(() => Effect.succeed("hello").apply((effect) => setCount.apply(effect)))
        .tap(() => Effect.succeed("hello").apply((effect) => setCount.apply(effect)))
        .tap(() => Effect.succeed("world").apply((effect) => setCount.apply(effect)))
        .bind("snapshots", () => Effect.succeed(MetricClient.unsafeSnapshots()))
        .map(({ snapshots }) =>
          snapshots
            .get(MetricKey.SetCount("sc3", "tag", labels))
            .map((snapshot) => snapshot.details)
        )

      const result = await program.unsafeRunPromise()

      expect((result.value as MetricType.SetCount).occurrences.toArray()).toEqual([
        Tuple("hello", 2),
        Tuple("world", 1)
      ])
    })
  })
})
