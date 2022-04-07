import { Action, resource } from "@effect/core/test/io/Scope/test-utils";
import { constTrue } from "@tsplus/stdlib/data/Function";

describe.concurrent("Scope", () => {
  describe.concurrent("parallelFinalizers", () => {
    it("runs finalizers when scope is closed", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<Action>()))
        .tap(({ ref }) =>
          Effect.scoped(
            Effect.parallelFinalizers(
              resource(1, ref).zipPar(resource(2, ref))
            ).flatMap(({ tuple: [resource1, resource2] }) =>
              ref
                .update((chunk) => chunk.append(Action.Use(resource1)))
                .zipPar(ref.update((chunk) => chunk.append(Action.Use(resource2))))
            )
          )
        )
        .flatMap(({ ref }) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.isTrue(result.take(2).find((action) => action == Action.Acquire(1)).isSome());
      assert.isTrue(result.take(2).find((action) => action == Action.Acquire(2)).isSome());
      assert.isTrue(result.drop(2).take(2).find((action) => action == Action.Use(1)).isSome());
      assert.isTrue(result.drop(2).take(2).find((action) => action == Action.Use(2)).isSome());
      assert.isTrue(result.drop(4).take(2).find((action) => action == Action.Release(1)).isSome());
      assert.isTrue(result.drop(4).take(2).find((action) => action == Action.Release(2)).isSome());
    });

    it("runs finalizers in parallel", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, void>())
        .tap(({ deferred }) =>
          Effect.scoped(
            Effect.parallelFinalizers(
              Effect.addFinalizer(deferred.succeed(undefined)) >
                Effect.addFinalizer(deferred.await())
            )
          )
        )
        .map(constTrue);

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });
  });
});
