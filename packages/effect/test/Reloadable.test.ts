import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import { Context, Effect, Layer, pipe, Reloadable } from "effect"
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
})
