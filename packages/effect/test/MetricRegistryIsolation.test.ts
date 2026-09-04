import { assert, describe, it } from "@effect/vitest"
import { Effect, Metric } from "effect"

const observe = <Input, State>(metric: Metric.Metric<Input, State>) =>
  Effect.gen(function*() {
    return [yield* Metric.value(metric), yield* Metric.snapshot]
  })

const counterObservation = <N extends number | bigint>(count: N, attributes?: Metric.Metric.AttributeSet) => {
  const state = { count, incremental: false }
  return [state, [{ id: "requests", type: "Counter" as const, description: undefined, attributes, state }]]
}

const at = <A, E, R>(effect: Effect.Effect<A, E, R>, registry: Metric.MetricRegistry) =>
  Effect.provideService(effect, Metric.MetricRegistry, registry)

const labels = { service: "api" }

describe("Metric registry isolation", () => {
  it.effect.each([
    {
      name: "shared counter A to B to A",
      mode: "shared",
      expected: [1, 0, 10, 1, 3, 10, 3],
      expectedAttributes: undefined
    },
    {
      name: "constructor attributes remain registry scoped",
      mode: "constructor",
      expected: [1, 0, 10, 1, 3, 10, 3],
      expectedAttributes: labels
    },
    {
      name: "constant input wrapper forwards registry",
      mode: "constant",
      expected: [1, 0, 1, 1, 2, 1, 2],
      expectedAttributes: undefined
    },
    {
      name: "contextual attributes isolate registries",
      mode: "contextual",
      expected: [1, 0, 10, 1, 3, 10, 3],
      expectedAttributes: labels
    },
    {
      name: "attribute wrapper isolates registries",
      mode: "attributes",
      expected: [1, 0, 10, 1, 3, 10, 3],
      expectedAttributes: labels
    },
    {
      name: "different objects isolate different registries",
      mode: "separate",
      expected: [1, 0, 10, 1, 3, 10, 3],
      expectedAttributes: undefined
    },
    {
      name: "different objects aggregate in the same registry",
      mode: "same-registry-separate",
      expected: [1, 1, 11, 11, 13, 13, 13],
      expectedAttributes: undefined
    },
    {
      name: "same object aggregates in the same registry",
      mode: "same-registry-shared",
      expected: [1, 1, 11, 11, 13, 13, 13],
      expectedAttributes: undefined
    }
  ])("$name", ({ expected, expectedAttributes, mode }) =>
    Effect.gen(function*() {
      const raw = Metric.counter("requests", mode === "constructor" ? { attributes: labels } : undefined)
      const first = mode === "constant"
        ? Metric.withConstantInput(raw, 1)
        : mode === "attributes"
        ? Metric.withAttributes(raw, labels)
        : raw
      const second = mode === "separate" || mode === "same-registry-separate" ? Metric.counter("requests") : first
      const registryA: Metric.MetricRegistry = new Map()
      const sameRegistry = mode.startsWith("same-registry")
      const registryB = sameRegistry ? registryA : new Map()
      const observations = []

      yield* at(Metric.update(first, 1), registryA)
      observations.push(yield* at(observe(first), registryA))
      observations.push(yield* at(observe(second), registryB))
      yield* at(Metric.update(second, 10), registryB)
      observations.push(yield* at(observe(second), registryB))
      observations.push(yield* at(observe(first), registryA))
      yield* at(Metric.update(first, 2), registryA)
      observations.push(yield* at(observe(first), registryA))
      observations.push(yield* at(observe(second), registryB))
      observations.push(yield* at(observe(first), registryA))

      assert.deepStrictEqual(observations, expected.map((count) => counterObservation(count, expectedAttributes)))
    }).pipe(Effect.provideService(Metric.CurrentMetricAttributes, mode === "contextual" ? { service: "api" } : {})))

  it.effect("read first registration is isolated before updates", () =>
    Effect.gen(function*() {
      const metric = Metric.counter("requests")
      const registryA: Metric.MetricRegistry = new Map()
      const registryB: Metric.MetricRegistry = new Map()
      const observations = [yield* at(observe(metric), registryA)]
      yield* at(Metric.update(metric, 10), registryB)
      observations.push(yield* at(observe(metric), registryB))
      observations.push(yield* at(observe(metric), registryA))
      yield* at(Metric.update(metric, 2), registryA)
      observations.push(yield* at(observe(metric), registryA))
      observations.push(yield* at(observe(metric), registryB))
      assert.deepStrictEqual(observations, [0, 10, 0, 2, 10].map((count) => counterObservation(count)))
    }))

  it.effect("gauge modify and update preserve both registries on revisits", () =>
    Effect.gen(function*() {
      const metric = Metric.gauge("load")
      const registryA: Metric.MetricRegistry = new Map()
      const registryB: Metric.MetricRegistry = new Map()
      const observations = []
      yield* at(Metric.update(metric, 5), registryA)
      observations.push(yield* at(observe(metric), registryA))
      yield* at(Metric.modify(metric, 10), registryB)
      observations.push(yield* at(observe(metric), registryB))
      yield* at(Metric.modify(metric, 2), registryA)
      observations.push(yield* at(observe(metric), registryA))
      yield* at(Metric.update(metric, 4), registryB)
      observations.push(yield* at(observe(metric), registryB))
      observations.push(yield* at(observe(metric), registryA))
      assert.deepStrictEqual(
        observations,
        [5, 10, 7, 4, 7].map((value) => {
          const state = { value }
          return [state, [{ id: "load", type: "Gauge", description: undefined, attributes: undefined, state }]]
        })
      )
    }))

  it.effect("bigint counter state survives registry revisits", () =>
    Effect.gen(function*() {
      const metric = Metric.counter("requests", { bigint: true })
      const registryA: Metric.MetricRegistry = new Map()
      const registryB: Metric.MetricRegistry = new Map()
      yield* at(Metric.update(metric, 1n), registryA)
      yield* at(Metric.update(metric, 10n), registryB)
      yield* at(Metric.update(metric, 2n), registryA)
      const observations = [yield* at(observe(metric), registryA), yield* at(observe(metric), registryB)]
      assert.deepStrictEqual(observations, [3n, 10n].map((count) => counterObservation(count)))
    }))
})
