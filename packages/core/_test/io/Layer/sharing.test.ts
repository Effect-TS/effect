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
  describe.concurrent("map", () => {
    it("does not interfere with sharing", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue(
          "env",
          ({ layer1, layer2, layer3 }) =>
            ((layer1.map(identity) >> layer2) + (layer1 >> layer3)).build
        )
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result[0] == Maybe.some(acquire1))
      assert.isTrue(result.drop(1).take(2).find((s) => s === acquire2).isSome())
      assert.isTrue(result.drop(1).take(2).find((s) => s === acquire3).isSome())
      assert.isTrue(result.drop(3).take(2).find((s) => s === release2).isSome())
      assert.isTrue(result.drop(3).take(2).find((s) => s === release3).isSome())
      assert.isTrue(result[5] == Maybe.some(release1))
    })
  })

  describe.concurrent("mapError", () => {
    it("does not interfere with sharing", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue(
          "env",
          ({ layer1, layer2, layer3 }) =>
            ((layer1.mapError(identity) >> layer2) >> (layer1 >> layer3)).build
        )
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result[0] == Maybe.some(acquire1))
      assert.isTrue(result.drop(1).take(2).find((s) => s === acquire2).isSome())
      assert.isTrue(result.drop(1).take(2).find((s) => s === acquire3).isSome())
      assert.isTrue(result.drop(3).take(2).find((s) => s === release2).isSome())
      assert.isTrue(result.drop(3).take(2).find((s) => s === release3).isSome())
      assert.isTrue(result[5] == Maybe.some(release1))
    })
  })

  describe.concurrent("orDie", () => {
    it("does not interfere with sharing", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue(
          "env",
          ({ layer1, layer2, layer3 }) => ((layer1.orDie >> layer2) >> (layer1 >> layer3)).build
        )
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result[0] == Maybe.some(acquire1))
      assert.isTrue(result.drop(1).take(2).find((s) => s === acquire2).isSome())
      assert.isTrue(result.drop(1).take(2).find((s) => s === acquire3).isSome())
      assert.isTrue(result.drop(3).take(2).find((s) => s === release2).isSome())
      assert.isTrue(result.drop(3).take(2).find((s) => s === release3).isSome())
      assert.isTrue(result[5] == Maybe.some(release1))
    })
  })
})
