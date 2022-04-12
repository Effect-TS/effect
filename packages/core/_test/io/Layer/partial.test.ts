describe.concurrent("Layer", () => {
  describe.concurrent("partial environment", () => {
    it("provides a partial environment to an effect", async () => {
      const NumberTag = Tag<number>();
      const StringTag = Tag<string>();

      const needsNumberAndString = Effect.tuple(
        Effect.service(NumberTag),
        Effect.service(StringTag)
      );

      const providesNumber = Layer.fromValue(NumberTag)(10);
      const providesString = Layer.fromValue(StringTag)("hi");

      const needsString = needsNumberAndString.provideSomeLayer(providesNumber);

      const program = needsString.provideLayer(providesString);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.get(0), 10);
      assert.strictEqual(result.get(1), "hi");
    });

    it("to provides a partial environment to another layer", async () => {
      const StringTag = Tag<string>();
      const NumberRefTag = Tag<Ref<number>>();

      interface FooService {
        readonly ref: Ref<number>;
        readonly string: string;
        readonly get: Effect<unknown, never, Tuple<[number, string]>>;
      }

      const FooTag = Tag<FooService>();

      const fooBuilder = Layer.environment<Has<string> & Has<Ref<number>>>().map(
        (env) => {
          const s = env.get(StringTag);
          const ref = env.get(NumberRefTag);
          return Env().add(FooTag, { ref, string: s, get: ref.get().map((i) => Tuple(i, s)) });
        }
      );

      const provideNumberRef = Layer.fromEffect(NumberRefTag)(Ref.make(10));
      const provideString = Layer.fromValue(StringTag)("hi");
      const needsString = provideNumberRef >> fooBuilder;
      const layer = provideString >> needsString;

      const program = Effect.serviceWithEffect(FooTag)((_) => _.get).provideLayer(
        layer
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.get(0), 10);
      assert.strictEqual(result.get(1), "hi");
    });

    it("andTo provides a partial environment to another layer", async () => {
      const StringTag = Tag<string>();
      const NumberRefTag = Tag<Ref<number>>();

      interface FooService {
        readonly ref: Ref<number>;
        readonly string: string;
        readonly get: Effect<unknown, never, Tuple<[number, string]>>;
      }

      const FooTag = Tag<FooService>();

      const fooBuilder = Layer.environment<Has<string> & Has<Ref<number>>>().map(
        (env) => {
          const s = env.get(StringTag);
          const ref = env.get(NumberRefTag);
          return Env().add(FooTag, { ref, string: s, get: ref.get().map((i) => Tuple(i, s)) });
        }
      );

      const provideNumberRef = Layer.fromEffect(NumberRefTag)(Ref.make(10));
      const provideString = Layer.fromValue(StringTag)("hi");
      const needsString = provideNumberRef > fooBuilder;
      const layer = provideString > needsString;

      const program = Effect.serviceWithEffect(FooTag)((_) => _.get)
        .flatMap(({ tuple: [i1, s] }) =>
          Effect.serviceWithEffect(NumberRefTag)((ref) => ref.get()).map((i2) => Tuple(i1, i2, s))
        )
        .provideLayer(layer);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.get(0), 10);
      assert.strictEqual(result.get(1), 10);
      assert.strictEqual(result.get(2), "hi");
    });
  });
});
