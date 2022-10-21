describe.concurrent("Stream", () => {
  describe.concurrent("serviceWith", () => {
    it("serviceWithEffect", async () => {
      interface ServiceWithEffect {
        readonly live: Effect<never, never, number>
      }

      const ServiceWithEffect = Tag<ServiceWithEffect>()

      const LiveServiceWithEffect = Layer.succeed(ServiceWithEffect)({
        live: Effect.sync(10)
      })

      const program = Stream.serviceWithEffect(ServiceWithEffect, (_) => _.live)
        .provideSomeLayer(LiveServiceWithEffect)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(10))
    })

    it("serviceWithStream", async () => {
      interface ServiceWithStream {
        readonly live: Stream<never, never, number>
      }

      const ServiceWithStream = Tag<ServiceWithStream>()

      const LiveServiceWithStream = Layer.succeed(ServiceWithStream)({
        live: Stream.fromCollection(Chunk.range(0, 10))
      })

      const program = Stream.serviceWithStream(ServiceWithStream, (_) => _.live)
        .provideSomeLayer(LiveServiceWithStream)
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 10))
    })
  })
})
