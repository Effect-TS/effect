import {
  acquire1,
  makeLayer1,
  makeLayer2,
  makeLayer3,
  makeRef,
  release1
} from "@effect/core/test/io/Layer/test-utils"

describe.concurrent("Layer", () => {
  describe.concurrent("fresh", () => {
    it("with and (+)", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer", ({ ref }) => makeLayer1(ref))
        .bindValue("env", ({ layer }) => (layer + layer.fresh).build)
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(acquire1, acquire1, release1, release1))
    })

    it("with to (>)", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer", ({ ref }) => makeLayer1(ref))
        .bindValue("env", ({ layer }) => (layer >> layer.fresh).build)
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(acquire1, acquire1, release1, release1))
    })

    it("with multiple layers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer", ({ ref }) => makeLayer1(ref))
        .bindValue("env", ({ layer }) => (layer + layer + (layer + layer).fresh).build)
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(acquire1, acquire1, release1, release1))
    })

    it("with identical fresh layers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue(
          "env",
          ({ layer1, layer2, layer3 }) =>
            (layer1.fresh >> (layer2 + (layer1 >> layer3).fresh)).build
        )
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.size, 8)
    })
  })
})
