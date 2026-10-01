import { describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import { Context, Effect, Fiber, Layer, pipe, Reloadable, Schedule, TestClock } from "effect"
import * as Counter from "./utils/counter.js"

const DummyServiceTypeId = Symbol.for("effect/test/Reloadable/DummyService")
type DummyServiceTypeId = typeof DummyServiceTypeId

interface DummyService {
  readonly [DummyServiceTypeId]: DummyServiceTypeId
}

const DummyService: DummyService = {
  [DummyServiceTypeId]: DummyServiceTypeId
}

const Tag = Context.GenericTag<DummyService>("DummyService")

describe("Reloadable", () => {
  it.effect("initialization", () =>
    Effect.gen(function*() {
      const counter = yield* Counter.make()
      const layer = Reloadable.manual(Tag, {
        layer: Layer.scoped(Tag, pipe(counter.acquire(), Effect.as(DummyService)))
      })
      yield* pipe(Reloadable.get(Tag), Effect.provide(layer))
      const acquired = yield* counter.acquired()
      strictEqual(acquired, 1)
    }))
  it.effect("reload", () =>
    Effect.gen(function*() {
      const counter = yield* Counter.make()
      const layer = Reloadable.manual(Tag, {
        layer: Layer.scoped(Tag, pipe(counter.acquire(), Effect.as(DummyService)))
      })
      yield* pipe(Reloadable.reload(Tag), Effect.provide(layer))
      const acquired = yield* counter.acquired()
      strictEqual(acquired, 2)
}))

  it.effect("auto releases its scope", () =>
    Effect.gen(function*() {
      const layer = Reloadable.auto(Tag, {
        layer: Layer.succeed(Tag, DummyService),
        schedule: Schedule.spaced("1 hour")
      })
      const fiber = yield* pipe(
        Effect.scoped(Layer.build(layer)),
        Effect.as(true),
        Effect.disconnect,
        Effect.timeoutTo({ duration: "1 second", onSuccess: (released) => released, onTimeout: () => false }),
        Effect.fork
      )
      yield* TestClock.adjust("1 second")
      const released = yield* Fiber.join(fiber)
      assertTrue(released)
    }))
})
