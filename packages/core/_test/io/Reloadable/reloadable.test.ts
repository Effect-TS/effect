import { Counter, DummyService } from "@effect/core/test/io/Reloadable/test-utils"

describe.concurrent("Reloadable", () => {
  it("initialization", () =>
    Do(($) => {
      const counter = $(Counter.make())
      const layer = Reloadable.manual(
        DummyService.ValueTag,
        DummyService.ReloadableTag,
        Layer.scoped(DummyService.ValueTag, counter.dummyService)
      )
      $(Effect.service(DummyService.ReloadableTag).provideLayer(layer))
      const acquired = $(counter.acquired)
      assert.strictEqual(acquired, 1)
    }).unsafeRunPromise())

  it("reload", () =>
    Do(($) => {
      const counter = $(Counter.make())
      const layer = Reloadable.manual(
        DummyService.ValueTag,
        DummyService.ReloadableTag,
        Layer.scoped(DummyService.ValueTag, counter.dummyService)
      )
      $(Reloadable.reload(DummyService.ReloadableTag).provideLayer(layer))
      const acquired = $(counter.acquired)
      assert.strictEqual(acquired, 2)
    }).unsafeRunPromise())
})
