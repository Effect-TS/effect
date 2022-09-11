import { Counter, DummyService } from "@effect/core/test/io/Reloadable/test-utils"

describe.concurrent("Reloadable", () => {
  it.effect("initialization", () =>
    Do(($) => {
      const counter = $(Counter.make())
      const layer = Reloadable.manual(
        DummyService.ValueTag,
        Layer.scoped(DummyService.ValueTag, counter.dummyService)
      )
      $(Reloadable.get(DummyService.ValueTag).provideLayer(layer))
      const acquired = $(counter.acquired)
      assert.strictEqual(acquired, 1)
    }))

  it.effect("reload", () =>
    Do(($) => {
      const counter = $(Counter.make())
      const layer = Reloadable.manual(
        DummyService.ValueTag,
        Layer.scoped(DummyService.ValueTag, counter.dummyService)
      )
      $(Reloadable.reload(DummyService.ValueTag).provideLayer(layer))
      const acquired = $(counter.acquired)
      assert.strictEqual(acquired, 2)
    }))
})
