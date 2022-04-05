import { State } from "@effect-ts/core/test/io/SynchronizedRef/test-utils";

const current = "value";
const update = "new value";
const failure = "failure";
const fatalError = ":-0";

describe.concurrent("SynchronizedRef", () => {
  describe.concurrent("modifyEffect", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make(current))
        .bind("v1", ({ ref }) => ref.modifyEffect(() => Effect.succeed(Tuple("hello", update))))
        .bind("v2", ({ ref }) => ref.get());

      const { v1, v2 } = await program.unsafeRunPromise();

      assert.strictEqual(v1, "hello");
      assert.strictEqual(v2, update);
    });

    it("with failure", async () => {
      const program = SynchronizedRef.make(current).flatMap((ref) => ref.modifyEffect(() => Effect.fail(failure)));

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(failure));
    });
  });

  describe.concurrent("modifySomeEffect", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("r1", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isClosed()
              ? Option.some(Effect.succeed(Tuple("changed", State.Changed)))
              : Option.none))
        .bind("v1", ({ ref }) => ref.get());

      const { r1, v1 } = await program.unsafeRunPromise();

      assert.strictEqual(r1, "state doesn't change");
      assert.deepEqual(v1, State.Active);
    });

    it("twice", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("r1", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", State.Changed)))
              : Option.none))
        .bind("v1", ({ ref }) => ref.get())
        .bind("r2", ({ ref }) =>
          ref.modifySomeEffect("state doesn't change", (state) =>
            state.isActive()
              ? Option.some(Effect.succeed(Tuple("changed", State.Changed)))
              : state.isChanged()
              ? Option.some(Effect.succeed(Tuple("closed", State.Closed)))
              : Option.none))
        .bind("v2", ({ ref }) => ref.get());

      const { r1, r2, v1, v2 } = await program.unsafeRunPromise();

      assert.strictEqual(r1, "changed");
      assert.deepEqual(v1, State.Changed);
      assert.strictEqual(r2, "closed");
      assert.deepEqual(v2, State.Closed);
    });

    it("with failure not triggered", async () => {
      const program = Effect.Do()
        .bind("ref", () => SynchronizedRef.make<State>(State.Active))
        .bind("r", ({ ref }) =>
          ref
            .modifySomeEffect("state doesn't change", (state) =>
              state.isClosed() ? Option.some(Effect.fail(failure)) : Option.none)
            .orDieWith(() =>
              new Error()
            ))
        .bind("v", ({ ref }) => ref.get());

      const { r, v } = await program.unsafeRunPromise();

      assert.strictEqual(r, "state doesn't change");
      assert.deepEqual(v, State.Active);
    });

    it("with failure", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.modifySomeEffect(
          "state doesn't change",
          (state) => state.isActive() ? Option.some(Effect.fail(failure)) : Option.none
        )
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(failure));
    });

    it("with fatal error", async () => {
      const program = SynchronizedRef.make<State>(State.Active).flatMap((ref) =>
        ref.modifySomeEffect(
          "state doesn't change",
          (state) => state.isActive() ? Option.some(Effect.dieMessage(fatalError)) : Option.none
        )
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.isFailure() && result.cause.dieOption().isSome());
    });
  });
});
