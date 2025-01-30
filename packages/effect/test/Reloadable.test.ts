import { Context, Effect, Layer, pipe, Reloadable } from "effect"
import { strictEqual } from "effect/test/util"
import * as Counter from "effect/test/utils/counter"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

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
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const layer = Reloadable.manual(Tag, {
        layer: Layer.scoped(Tag, pipe(counter.acquire(), Effect.as(DummyService)))
      })
      yield* $(Reloadable.get(Tag), Effect.provide(layer))
      const acquired = yield* $(counter.acquired())
      strictEqual(acquired, 1)
    }))
  it.effect("reload", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Counter.make())
      const layer = Reloadable.manual(Tag, {
        layer: Layer.scoped(Tag, pipe(counter.acquire(), Effect.as(DummyService)))
      })
      yield* $(Reloadable.reload(Tag), Effect.provide(layer))
      const acquired = yield* $(counter.acquired())
      strictEqual(acquired, 2)
    }))
})
