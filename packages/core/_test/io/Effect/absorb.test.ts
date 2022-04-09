const ExampleError = new Error("Oh noes!");

const ExampleErrorFail = Effect.fail(ExampleError);
const ExampleErrorDie = Effect.die(() => {
  throw ExampleError;
});

describe.concurrent("Effect", () => {
  describe.concurrent("absorbWith", () => {
    it("on fail", async () => {
      const program = ExampleErrorFail.absorbWith(identity);

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(ExampleError));
    });

    it("on die", async () => {
      const program = ExampleErrorDie.absorbWith(identity);

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail(ExampleError));
    });

    it("on success", async () => {
      const program = Effect.succeed(1).absorbWith(() => ExampleError);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 1);
    });
  });
});
