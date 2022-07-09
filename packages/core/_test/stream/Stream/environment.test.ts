import { NumberService, NumberServiceImpl } from "@effect/core/test/stream/Stream/test-utils"

describe.concurrent("Stream", () => {
  describe.concurrent("environment", () => {
    it("simple example", async () => {
      const StringTag = Tag<string>()
      const program = Stream
        .environment<string>()
        .map((env) => env.get(StringTag))
        .provideEnvironment(Env(StringTag, "test"))
        .runHead

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some("test"))
    })
  })

  describe.concurrent("environmentWith", () => {
    it("simple example", async () => {
      const StringTag = Tag<string>()
      const program = Stream.environmentWith((env: Env<string>) => env.get(StringTag))
        .provideEnvironment(Env(StringTag, "test"))
        .runHead

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some("test"))
    })
  })

  describe.concurrent("environmentWithEffect", () => {
    it("simple example", async () => {
      const program = Stream.environmentWithEffect((env: Env<NumberService>) => Effect.succeed(env.get(NumberService)))
        .provideEnvironment(Env(NumberService, new NumberServiceImpl(10)))
        .runHead
        .some

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.n, 10)
    })

    it("environmentWithZIO fails", async () => {
      const program = Stream.environmentWithEffect((_: Env<NumberService>) => Effect.fail("fail"))
        .provideEnvironment(Env(NumberService, new NumberServiceImpl(10)))
        .runHead

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("fail"))
    })
  })

  describe.concurrent("environmentWithStream", () => {
    it("environmentWithStream", async () => {
      const program = Stream.environmentWithStream((env: Env<NumberService>) => Stream.succeed(env.get(NumberService)))
        .provideEnvironment(Env(NumberService, new NumberServiceImpl(10)))
        .runHead
        .some

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.n, 10)
    })

    it("environmentWithStream fails", async () => {
      const program = Stream.environmentWithStream((env: Env<NumberService>) => Stream.fail("fail"))
        .provideEnvironment(Env(NumberService, new NumberServiceImpl(10)))
        .runHead

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("fail"))
    })
  })

  describe.concurrent("provideLayer", () => {
    it("simple example", async () => {
      const program = Stream.scoped(Effect.service(NumberService))
        .provideLayer(Layer.succeed(NumberService, new NumberServiceImpl(10)))
        .runHead

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Maybe.some(new NumberServiceImpl(10)))
    })
  })
})
