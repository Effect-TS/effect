describe.concurrent("Stream", () => {
  describe.concurrent("serviceWith", () => {
    it("serviceWithEffect", async () => {
      const ServiceWithEffectId = Symbol.for("@effect-ts/core/test/stream/Stream/ServiceWithEffectId");

      interface ServiceWithEffect {
        readonly live: UIO<number>;
      }

      const ServiceWithEffect = Service<ServiceWithEffect>(ServiceWithEffectId);

      const program = Stream.serviceWithEffect(ServiceWithEffect)((_) => _.live)
        .provideSomeLayer(Layer.succeed(ServiceWithEffect({ live: Effect.succeed(10) })))
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk(10));
    });

    it("serviceWithStream", async () => {
      const ServiceWithStreamId = Symbol.for("@effect-ts/core/test/stream/Stream/ServiceWithEffectId");

      interface ServiceWithStream {
        readonly live: Stream<unknown, never, number>;
      }

      const ServiceWithStream = Service<ServiceWithStream>(ServiceWithStreamId);

      const program = Stream.serviceWithStream(ServiceWithStream)((_) => _.live)
        .provideSomeLayer(
          Layer.succeed(ServiceWithStream({ live: Stream.fromCollection(Chunk.range(0, 10)) }))
        )
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Chunk.range(0, 10));
    });
  });
});
