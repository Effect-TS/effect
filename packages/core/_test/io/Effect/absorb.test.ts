const ExampleError = new Error("Oh noes!");

const ExampleErrorFail = Effect.fail(ExampleError);
const ExampleErrorDie = Effect.die(() => {
  throw ExampleError;
});

describe.concurrent("Effect", () => {
  describe.concurrent("absorbWith", () => {
    test("on fail", () =>
      Do((await) => {
        const result = await (ExampleErrorFail.absorbWith(Option.some).exit());
        assert.isTrue(result.untraced() == Exit.fail(Option.some(ExampleError)));
      }));

    test("on die", () =>
      Do((await) => {
        const result = await (ExampleErrorDie.absorbWith(() => "never").exit());
        assert.isTrue(result.untraced() == Exit.fail(ExampleError));
      }));

    test("on success", () =>
      Do((await) => {
        const result = await (Effect.succeed(1).absorbWith(() => ExampleError));
        assert.strictEqual(result, 1);
      }));
  });
});
