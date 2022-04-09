describe.concurrent("Layer", () => {
  describe.concurrent("caching", () => {
    it("caching values in dependencies", async () => {
      class Config {
        constructor(readonly value: number) {}
      }

      const AId = Symbol();

      class A {
        constructor(readonly value: number) {}
      }

      const ATag = Service<A>(AId);

      const aLayer = Layer.fromFunction(ATag)((_: Config) => new A(_.value));

      const BId = Symbol();

      class B {
        constructor(readonly value: number) {}
      }

      const BTag = Service<B>(BId);

      const bLayer = Layer.fromFunction(BTag)((_: Has<A>) => new B(ATag.get(_).value));

      const CId = Symbol();

      class C {
        constructor(readonly value: number) {}
      }

      const CTag = Service<C>(CId);

      const cLayer = Layer.fromFunction(CTag)((_: Has<A>) => new C(ATag.get(_).value));

      const fedB = (Layer.succeed(new Config(1)) >> aLayer) >> bLayer;
      const fedC = (Layer.succeed(new Config(2)) >> aLayer) >> cLayer;

      const program = Effect.scoped((fedB + fedC).build()).map((_) => Tuple(BTag.get(_), CTag.get(_)));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.get(0).value, 1);
      assert.strictEqual(result.get(1).value, 1);
    });
  });
});
