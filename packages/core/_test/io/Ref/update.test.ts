import { State } from "@effect-ts/core/test/io/Ref/test-utils";

const current = "value";
const update = "new value";

describe.concurrent("Ref", () => {
  describe.concurrent("update", () => {
    it("simple", async () => {
      const program = Ref.make(current)
        .tap((ref) => ref.update(() => update))
        .flatMap((ref) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, update);
    });
  });

  describe.concurrent("updateAndGet", () => {
    it("simple", async () => {
      const program = Ref.make(current).flatMap((ref) => ref.updateAndGet(() => update));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, update);
    });
  });

  describe.concurrent("updateSome", () => {
    it("simple", async () => {
      const program = Ref.make<State>(State.Active)
        .tap((ref) => ref.updateSome((state) => state.isClosed() ? Option.some(State.Changed) : Option.none))
        .flatMap((ref) => ref.get());

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, State.Active);
    });

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .tap(({ ref }) => ref.updateSome((state) => state.isActive() ? Option.some(State.Changed) : Option.none))
        .bind("v1", ({ ref }) => ref.get())
        .tap(({ ref }) =>
          ref.updateSome((state) =>
            state.isActive()
              ? Option.some(State.Changed)
              : state.isChanged()
              ? Option.some(State.Closed)
              : Option.none
          )
        )
        .bind("v2", ({ ref }) => ref.get());

      const { v1, v2 } = await program.unsafeRunPromise();

      assert.deepEqual(v1, State.Changed);
      assert.deepEqual(v2, State.Closed);
    });
  });

  describe.concurrent("updateSomeAndGet", () => {
    it("simple", async () => {
      const program = Ref.make<State>(State.Active).flatMap((ref) =>
        ref.updateSomeAndGet((state) => state.isClosed() ? Option.some(State.Changed) : Option.none)
      );

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, State.Active);
    });

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<State>(State.Active))
        .bind(
          "v1",
          ({ ref }) => ref.updateSomeAndGet((state) => state.isActive() ? Option.some(State.Changed) : Option.none)
        )
        .bind("v2", ({ ref }) =>
          ref.updateSomeAndGet((state) =>
            state.isActive()
              ? Option.some(State.Changed)
              : state.isChanged()
              ? Option.some(State.Closed)
              : Option.none
          ));

      const { v1, v2 } = await program.unsafeRunPromise();

      assert.deepEqual(v1, State.Changed);
      assert.deepEqual(v2, State.Closed);
    });
  });
});
