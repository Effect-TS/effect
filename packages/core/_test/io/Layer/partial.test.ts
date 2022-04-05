describe.concurrent("Layer", () => {
  describe.concurrent("partial environment", () => {
    it("provides a partial environment to an effect", async () => {
      const NumberProviderId = Symbol();
      const NumberProvider = Service<number>(NumberProviderId);

      const StringProviderId = Symbol();
      const StringProvider = Service<string>(StringProviderId);

      const needsNumberAndString = Effect.tuple(
        Effect.service(NumberProvider),
        Effect.service(StringProvider)
      );

      const providesNumber = Layer.fromValue(NumberProvider)(10);
      const providesString = Layer.fromValue(StringProvider)("hi");

      const needsString = needsNumberAndString.provideSomeLayer(providesNumber);

      const program = needsString.provideLayer(providesString);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.get(0), 10);
      assert.strictEqual(result.get(1), "hi");
    });

    it("to provides a partial environment to another layer", async () => {
      const StringProviderId = Symbol();

      const StringProvider = Service<string>(StringProviderId);

      const NumberRefProviderId = Symbol();

      const NumberRefProvider = Service<Ref<number>>(NumberRefProviderId);

      const FooServiceId = Symbol();

      interface FooService {
        readonly ref: Ref<number>;
        readonly string: string;
        readonly get: Effect<unknown, never, Tuple<[number, string]>>;
      }

      const FooService = Service<FooService>(FooServiceId);

      const fooBuilder = Layer.environment<Has<string> & Has<Ref<number>>>().map(
        (_) => {
          const s = StringProvider.get(_);
          const ref = NumberRefProvider.get(_);
          return FooService({ ref, string: s, get: ref.get().map((i) => Tuple(i, s)) });
        }
      );

      const provideNumberRef = Layer.fromEffect(NumberRefProvider)(Ref.make(10));
      const provideString = Layer.fromValue(StringProvider)("hi");
      const needsString = provideNumberRef >> fooBuilder;
      const layer = provideString >> needsString;

      const program = Effect.serviceWithEffect(FooService)((_) => _.get).provideLayer(
        layer
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.get(0), 10);
      assert.strictEqual(result.get(1), "hi");
    });

    it("andTo provides a partial environment to another layer", async () => {
      const StringProviderId = Symbol();

      const StringProvider = Service<string>(StringProviderId);

      const NumberRefProviderId = Symbol();

      const NumberRefProvider = Service<Ref<number>>(NumberRefProviderId);

      const FooServiceId = Symbol();

      interface FooService {
        readonly ref: Ref<number>;
        readonly string: string;
        readonly get: Effect<unknown, never, Tuple<[number, string]>>;
      }

      const FooService = Service<FooService>(FooServiceId);

      const fooBuilder = Layer.environment<Has<string> & Has<Ref<number>>>().map(
        (_) => {
          const s = StringProvider.get(_);
          const ref = NumberRefProvider.get(_);
          return FooService({ ref, string: s, get: ref.get().map((i) => Tuple(i, s)) });
        }
      );

      const provideNumberRef = Layer.fromEffect(NumberRefProvider)(Ref.make(10));
      const provideString = Layer.fromValue(StringProvider)("hi");
      const needsString = provideNumberRef > fooBuilder;
      const layer = provideString > needsString;

      const program = Effect.serviceWithEffect(FooService)((_) => _.get)
        .flatMap(({ tuple: [i1, s] }) =>
          Effect.serviceWithEffect(NumberRefProvider)((ref) => ref.get()).map((i2) => Tuple(i1, i2, s))
        )
        .provideLayer(layer);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.get(0), 10);
      assert.strictEqual(result.get(1), 10);
      assert.strictEqual(result.get(2), "hi");
    });
  });
});
