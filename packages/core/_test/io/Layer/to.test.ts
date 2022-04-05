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
} from "@effect-ts/core/test/io/Layer/test-utils";

describe.concurrent("Layer", () => {
  describe.concurrent("to (>)", () => {
    it("sharing", async () => {
      const expected = [acquire1, release1];

      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer", ({ ref }) => makeLayer1(ref))
        .bindValue("env", ({ layer }) => (layer >> layer).build())
        .tap(({ env }) => Effect.scoped(env))
        .bind("actual", ({ ref }) => ref.get());

      const { actual } = await program.unsafeRunPromise();

      assert.isTrue(actual == expected);
    });

    it("sharing with multiple layers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue("env", ({ layer1, layer2, layer3 }) => ((layer1 >> layer2) + (layer1 >> layer3)).build())
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result[0] == Option.some(acquire1));
      assert.isTrue(result.drop(1).take(2).find((s) => s === acquire2).isSome());
      assert.isTrue(result.drop(1).take(2).find((s) => s === acquire3).isSome());
      assert.isTrue(result.drop(3).take(2).find((s) => s === acquire2).isSome());
      assert.isTrue(result.drop(3).take(2).find((s) => s === release3).isSome());
      assert.isTrue(result[5] == Option.some(release1));
    });

    it("finalizers with to", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 >> layer2).build())
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(acquire1, acquire2, release2, release1));
    });

    it("finalizers with multiple layers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("layer3", ({ ref }) => makeLayer3(ref))
        .bindValue("env", ({ layer1, layer2, layer3 }) => ((layer1 >> layer2) >> layer3).build())
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(acquire1, acquire2, acquire3, release3, release2, release1));
    });
  });
});
