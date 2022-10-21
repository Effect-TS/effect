import {
  acquire1,
  acquire2,
  acquire3,
  makeLayer1,
  makeLayer2,
  makeLayer3,
  makeRef,
  release1,
  release2,
  release3
} from "@effect/core/test/io/Layer/test-utils"

describe.concurrent("Layer", () => {
  describe.concurrent("interruption", () => {
    it("with and (+)", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build)
        .bind("fiber", ({ env }) => Effect.scoped(env).fork)
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      if (result.find((s) => s === acquire1).isSome()) {
        assert.isTrue(result.find((s) => s === release1).isSome())
      }
      if (result.find((s) => s === acquire2).isSome()) {
        assert.isTrue(result.find((s) => s === release2).isSome())
      }
    })

    it("with to (>)", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 >> layer2).build)
        .bind("fiber", ({ env }) => Effect.scoped(env).fork)
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      if (result.find((s) => s === acquire1).isSome()) {
        assert.isTrue(result.find((s) => s === release1).isSome())
      }
      if (result.find((s) => s === acquire2).isSome()) {
        assert.isTrue(result.find((s) => s === release2).isSome())
      }
    })

    it("with multiple layers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue(
          "env",
          ({ layer1, layer2, layer3 }) => (layer1 >> (layer2 + (layer1 >> layer3))).build
        )
        .bind("fiber", ({ env }) => Effect.scoped(env).fork)
        .tap(({ fiber }) => fiber.interrupt)
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      if (result.find((s) => s === acquire1).isSome()) {
        assert.isTrue(result.find((s) => s === release1).isSome())
      }
      if (result.find((s) => s === acquire2).isSome()) {
        assert.isTrue(result.find((s) => s === release2).isSome())
      }
      if (result.find((s) => s === acquire3).isSome()) {
        assert.isTrue(result.find((s) => s === release3).isSome())
      }
    })
  })
})
