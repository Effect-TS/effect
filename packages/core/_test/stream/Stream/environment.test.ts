import { NumberService } from "@effect-ts/core/test/stream/Stream/test-utils";

describe("Stream", () => {
  describe("environment", () => {
    it("simple example", async () => {
      const program = Stream.environment<string>().provideEnvironment("test").runHead();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some("test"));
    });
  });

  describe("environmentWith", () => {
    it("simple example", async () => {
      const program = Stream.environmentWith((r: string) => r)
        .provideEnvironment("test")
        .runHead();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some("test"));
    });
  });

  describe("environmentWithEffect", () => {
    it("simple example", async () => {
      const program = Stream.environmentWithEffect((r: Has<NumberService>) => Effect.succeed(NumberService.get(r)))
        .provideEnvironment(NumberService({ n: 10 }))
        .runHead().some;

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.n, 10);
    });

    it("environmentWithZIO fails", async () => {
      const program = Stream.environmentWithEffect((r: Has<NumberService>) => Effect.fail("fail"))
        .provideEnvironment(NumberService({ n: 10 }))
        .runHead();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("fail"));
    });
  });

  describe("environmentWithStream", () => {
    it("environmentWithStream", async () => {
      const program = Stream.environmentWithStream((r: Has<NumberService>) => Stream.succeed(NumberService.get(r)))
        .provideEnvironment(NumberService({ n: 10 }))
        .runHead().some;

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.n, 10);
    });

    it("environmentWithStream fails", async () => {
      const program = Stream.environmentWithStream((r: Has<NumberService>) => Stream.fail("fail"))
        .provideEnvironment(NumberService({ n: 10 }))
        .runHead();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("fail"));
    });
  });

  describe("provideLayer", () => {
    it("simple example", async () => {
      const program = Stream.scoped(Effect.service(NumberService))
        .provideLayer(Layer.succeed(NumberService({ n: 10 })))
        .runHead();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some({ n: 10 }));
    });
  });
});
