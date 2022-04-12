import { NumberService, NumberServiceImpl } from "@effect/core/test/stream/Stream/test-utils";

describe("Stream", () => {
  describe("environment", () => {
    it("simple example", async () => {
      const StringTag = Tag<string>();
      const program = Stream
        .environment<Has<string>>()
        .map((env) => env.get(StringTag))
        .provideEnvironment(Env().add(StringTag, "test"))
        .runHead();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some("test"));
    });
  });

  describe("environmentWith", () => {
    it("simple example", async () => {
      const StringTag = Tag<string>();
      const program = Stream.environmentWith((env: Env<Has<string>>) => env.get(StringTag))
        .provideEnvironment(Env().add(StringTag, "test"))
        .runHead();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some("test"));
    });
  });

  describe("environmentWithEffect", () => {
    it("simple example", async () => {
      const program =
        Stream.environmentWithEffect((env: Env<Has<NumberService>>) => Effect.succeed(env.get(NumberService)))
          .provideEnvironment(Env().add(NumberService, new NumberServiceImpl(10)))
          .runHead().some;

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.n, 10);
    });

    it("environmentWithZIO fails", async () => {
      const program = Stream.environmentWithEffect((_: Env<Has<NumberService>>) => Effect.fail("fail"))
        .provideEnvironment(Env().add(NumberService, new NumberServiceImpl(10)))
        .runHead();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("fail"));
    });
  });

  describe("environmentWithStream", () => {
    it("environmentWithStream", async () => {
      const program =
        Stream.environmentWithStream((env: Env<Has<NumberService>>) => Stream.succeed(env.get(NumberService)))
          .provideEnvironment(Env().add(NumberService, new NumberServiceImpl(10)))
          .runHead().some;

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.n, 10);
    });

    it("environmentWithStream fails", async () => {
      const program = Stream.environmentWithStream((env: Env<Has<NumberService>>) => Stream.fail("fail"))
        .provideEnvironment(Env().add(NumberService, new NumberServiceImpl(10)))
        .runHead();

      const result = await program.unsafeRunPromiseExit();

      assert.isTrue(result.untraced() == Exit.fail("fail"));
    });
  });

  describe("provideLayer", () => {
    it("simple example", async () => {
      const program = Stream.scoped(Effect.service(NumberService))
        .provideLayer(Layer.succeed(NumberService)(new NumberServiceImpl(10)))
        .runHead();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(new NumberServiceImpl(10)));
    });
  });
});
