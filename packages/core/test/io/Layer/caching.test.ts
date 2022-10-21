describe.concurrent("Layer", () => {
  describe.concurrent("caching", () => {
    it("caching values in dependencies", async () => {
      class Config {
        constructor(readonly value: number) {}
      }

      const ConfigTag = Tag<Config>()

      class A {
        constructor(readonly value: number) {}
      }

      const ATag = Tag<A>()

      const aLayer = Layer.fromFunction(ConfigTag, ATag, (_: Config) => new A(_.value))

      class B {
        constructor(readonly value: number) {}
      }

      const BTag = Tag<B>()

      const bLayer = Layer.fromFunction(ATag, BTag, (_: A) => new B(_.value))

      class C {
        constructor(readonly value: number) {}
      }

      const CTag = Tag<C>()

      const cLayer = Layer.fromFunction(ATag, CTag, (_: A) => new C(_.value))

      const fedB = (Layer.succeed(ConfigTag)(new Config(1)) >> aLayer) >> bLayer
      const fedC = (Layer.succeed(ConfigTag)(new Config(2)) >> aLayer) >> cLayer

      const program = Effect.scoped((fedB + fedC).build).map((env) =>
        [env.get(BTag), env.get(CTag)] as const
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result[0].value, 1)
      assert.strictEqual(result[1].value, 1)
    })
  })
})
