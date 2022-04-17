import { Action, resource } from "@effect/core/test/io/Scope/test-utils";

describe.concurrent("Scope", () => {
  describe.concurrent("scoped", () => {
    it("runs finalizers when scope is closed", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<Action>()))
        .tap(({ ref }) =>
          resource(1, ref)
            .flatMap((id) => ref.update((chunk) => chunk.append(Action.Use(id))))
            .scoped()
        )
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result == Chunk(
          Action.Acquire(1),
          Action.Use(1),
          Action.Release(1)
        )
      );
    });
  });
});
