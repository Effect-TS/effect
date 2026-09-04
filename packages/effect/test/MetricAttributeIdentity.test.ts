import { assert, describe, it } from "@effect/vitest"
import { Effect, Metric } from "effect"

const firstLabels = { route: "/users", method: "GET" }
const reversedLabels = { method: "GET", route: "/users" }

const snapshot = (count: number, attributes: Metric.Metric.AttributeSet) => ({
  id: "requests",
  type: "Counter" as const,
  description: undefined,
  attributes,
  state: { count, incremental: false }
})

describe("Metric attribute identity", () => {
  it.effect.each([
    { name: "reversed records select one series", mode: "records" },
    { name: "reversed tuples and record select one series", mode: "tuples" },
    { name: "reversed contextual records select one series", mode: "contextual" },
    { name: "opposite attribute wrapper composition selects one series", mode: "wrappers" },
    { name: "identical order records select one series", mode: "identical" },
    { name: "different values select separate series", mode: "different" },
    { name: "delimiter collision labels remain separate", mode: "delimiter" }
  ])("$name", ({ mode }) =>
    Effect.gen(function*() {
      const firstAttributes = mode === "delimiter" ? { a: "b,c=d" } : firstLabels
      const secondAttributes = mode === "delimiter"
        ? { a: "b", c: "d" }
        : mode === "different"
        ? { route: "/users", method: "POST" }
        : mode === "identical"
        ? { ...firstLabels }
        : reversedLabels
      const raw = Metric.counter("requests")
      const first = mode === "contextual"
        ? raw
        : mode === "wrappers"
        ? raw.pipe(Metric.withAttributes({ method: "GET" }), Metric.withAttributes({ route: "/users" }))
        : Metric.counter("requests", {
          attributes: mode === "tuples" ? [["route", "/users"], ["method", "GET"]] : firstAttributes
        })
      const second = mode === "contextual"
        ? raw
        : mode === "wrappers"
        ? raw.pipe(Metric.withAttributes({ route: "/users" }), Metric.withAttributes({ method: "GET" }))
        : Metric.counter("requests", {
          attributes: mode === "tuples" ? [["method", "GET"], ["route", "/users"]] : secondAttributes
        })
      const withLabels = <A, E, R>(effect: Effect.Effect<A, E, R>, attributes: Metric.Metric.AttributeSet) =>
        mode === "contextual" ? Effect.provideService(effect, Metric.CurrentMetricAttributes, attributes) : effect
      yield* withLabels(Metric.update(first, 1), firstAttributes)
      yield* withLabels(Metric.update(second, 10), secondAttributes)
      const observations = [
        (yield* withLabels(Metric.value(first), firstAttributes)).count,
        (yield* withLabels(Metric.value(second), secondAttributes)).count,
        (yield* Metric.value(Metric.counter("requests", { attributes: firstAttributes }))).count,
        yield* Metric.snapshot
      ]
      const separate = mode === "different" || mode === "delimiter"
      assert.deepStrictEqual(
        observations,
        separate
          ? [1, 10, 1, [snapshot(1, firstAttributes), snapshot(10, secondAttributes)]]
          : [11, 11, 11, [snapshot(11, firstAttributes)]]
      )
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))

  it.effect("key creation does not reorder caller tuples records or public metadata", () =>
    Effect.gen(function*() {
      const tuples: Array<[string, string]> = [["route", "/users"], ["method", "GET"]]
      const record = { route: "/users", method: "GET" }
      const tupleMetric = Metric.counter("tuples", { attributes: tuples })
      const recordMetric = Metric.counter("record", { attributes: record })
      yield* Metric.update(tupleMetric, 1)
      yield* Metric.update(recordMetric, 10)
      const snapshots = yield* Metric.snapshot
      assert.deepStrictEqual({
        tuples,
        recordKeys: Object.keys(record),
        metricKeys: [Object.keys(tupleMetric.attributes ?? {}), Object.keys(recordMetric.attributes ?? {})],
        snapshotKeys: snapshots.map((item) => Object.keys(item.attributes ?? {})),
        values: [yield* Metric.value(tupleMetric), yield* Metric.value(recordMetric)]
      }, {
        tuples: [["route", "/users"], ["method", "GET"]],
        recordKeys: ["route", "method"],
        metricKeys: [["route", "method"], ["route", "method"]],
        snapshotKeys: [["route", "method"], ["route", "method"]],
        values: [{ count: 1, incremental: false }, { count: 10, incremental: false }]
      })
    }).pipe(Effect.provideService(Metric.MetricRegistry, new Map())))
})
