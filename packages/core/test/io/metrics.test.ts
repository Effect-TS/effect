import { Chunk } from "../../src/collection/immutable/Chunk"
import { Option } from "../../src/data/Option"
import { Effect } from "../../src/io/Effect"
import { Counter } from "../../src/io/Metrics/Counter"
import { Metric } from "../../src/io/Metrics/Metric"
import { MetricClient } from "../../src/io/Metrics/MetricClient"
import { MetricKey } from "../../src/io/Metrics/MetricKey"
import { MetricLabel } from "../../src/io/Metrics/MetricLabel"
import { MetricType } from "../../src/io/Metrics/MetricType"

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
        .apply(Metric.track(counter))
        .tap(() => Effect.unit.apply(Metric.track(counter)))
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
        .apply(Metric.track(counter))
        .flatMap(() => Effect.succeed(5).apply(Metric.track(counter)))
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
        .tap(() => Effect.unit.apply(Metric.track(Metric.count("c5", ...labels))))
        .tap(() => Effect.unit.apply(Metric.track(Metric.count("c5", ...labels))))
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
        .tap(() =>
          Effect.succeed(10).apply(Metric.track(Metric.countValue("c6", ...labels)))
        )
        .tap(() =>
          Effect.succeed(5).apply(Metric.track(Metric.countValue("c6", ...labels)))
        )
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
        .tap(() => Effect.succeed("hello").apply(Metric.track(counter)))
        .tap(() => Effect.succeed("!").apply(Metric.track(counter)))
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
            Effect.unit.apply(Metric.track(counter)) >
            Effect.fail("error").apply(Metric.track(counter))
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
        .tap(() => Effect.succeed("hello").apply(Metric.track(counter)))
        .tap(() => Effect.succeed("!").apply(Metric.track(counter)))
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
        .tap(() => Effect.succeed("hello").apply(Metric.track(counter)))
        .tap(() => Effect.succeed("!").apply(Metric.track(counter)))
        .tap(() => Effect.succeed("!").apply(Metric.track(counter)))
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
        .tap(() => Effect.succeed("!").apply(Metric.track(counter2)))
        .tap(() => Effect.succeed("hello").apply(Metric.track(counter1)))
        .tap(() => Effect.succeed("!").apply(Metric.track(counter1)))
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
})
