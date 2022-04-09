import {
  acquire1,
  acquire2,
  HasService1,
  makeLayer1,
  makeLayer2,
  makeRef,
  release1,
  release2,
  Service1
} from "@effect/core/test/io/Layer/test-utils";

describe.concurrent("Layer", () => {
  describe.concurrent("and (+)", () => {
    it("sharing with and", async () => {
      const expected = [acquire1, release1];

      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer", ({ ref }) => makeLayer1(ref))
        .bindValue("env", ({ layer }) => (layer + layer).build())
        .tap(({ env }) => Effect.scoped(env))
        .bind("actual", ({ ref }) => ref.get());

      const { actual } = await program.unsafeRunPromise();

      assert.isTrue(actual == expected);
    });

    it("sharing itself with and", async () => {
      const program = Effect.scoped(
        Effect.Do()
          .bindValue("m", () => new Service1())
          .bindValue("layer", ({ m }) => Layer.fromValue(HasService1)(m))
          .bindValue("env", ({ layer }) => (layer + layer + layer).build())
          .bind("m1", ({ env }) => env.flatMap((m) => Effect.attempt(HasService1.get(m))))
      );

      const { m, m1 } = await program.unsafeRunPromise();

      assert.strictEqual(m, m1);
    });

    it("finalizers", async () => {
      const program = Effect.Do()
        .bind("ref", () => makeRef())
        .bindValue("layer1", ({ ref }) => makeLayer1(ref))
        .bindValue("layer2", ({ ref }) => makeLayer2(ref))
        .bindValue("env", ({ layer1, layer2 }) => (layer1 + layer2).build())
        .tap(({ env }) => Effect.scoped(env))
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.take(2).find((s) => s === acquire1).isSome());
      assert.isTrue(result.take(2).find((s) => s === acquire2).isSome());
      assert.isTrue(result.take(4).takeRight(2).find((s) => s === release1).isSome());
      assert.isTrue(result.take(4).takeRight(2).find((s) => s === release2).isSome());
    });
  });
});
