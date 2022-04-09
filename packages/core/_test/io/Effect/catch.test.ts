describe.concurrent("Effect", () => {
  describe.concurrent("catchNonFatalOrDie", () => {
    it("recovers from non-fatal", async () => {
      const message = "division by zero";
      const program = Effect.fail(
        new IllegalArgumentException(message)
      ).catchNonFatalOrDie((e) => Effect.succeed(e.message));

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.succeed(message));
    });
  });

  describe.concurrent("catchAllDefect", () => {
    it("recovers from all defects", async () => {
      const message = "division by zero";
      const program = Effect.die(new IllegalArgumentException(message)).catchAllDefect(
        (e) => Effect.succeed((e as Error).message)
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, message);
    });

    it("leaves errors", async () => {
      const error = new IllegalArgumentException("division by zero");
      const program = Effect.fail(error).catchAllDefect((e) => Effect.succeed((e as Error).message));

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(error));
    });

    it("leaves values", async () => {
      const error = new IllegalArgumentException("division by zero");
      const program = Effect.succeed(error).catchAllDefect((e) => Effect.succeed((e as Error).message));

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, error);
    });
  });

  describe.concurrent("catchSomeDefect", () => {
    it("recovers from some defects", async () => {
      const message = "division by zero";
      const program = Effect.die(new IllegalArgumentException(message)).catchSomeDefect(
        (e) =>
          e instanceof IllegalArgumentException
            ? Option.some(Effect.succeed(e.message))
            : Option.none
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, message);
    });

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero");
      const program = Effect.die(error).catchSomeDefect((e) =>
        e instanceof RuntimeError ? Option.some(Effect.succeed(e.message)) : Option.none
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.die(error));
    });

    it("leaves errors", async () => {
      const error = new IllegalArgumentException("division by zero");
      const program = Effect.fail(error).catchSomeDefect((e) =>
        e instanceof IllegalArgumentException
          ? Option.some(Effect.succeed(e.message))
          : Option.none
      );

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(error));
    });

    it("leaves values", async () => {
      const error = new IllegalArgumentException("division by zero");
      const program = Effect.succeed(error).catchSomeDefect((e) =>
        e instanceof IllegalArgumentException
          ? Option.some(Effect.succeed(e.message))
          : Option.none
      );

      const result = await program.unsafeRunPromise();

      assert.deepEqual(result, error);
    });
  });
});
