describe.concurrent("Stream", () => {
  describe.concurrent("serviceWith", () => {
    it("serviceWithEffect", async () => {
      interface ServiceWithEffect {
        readonly live: Effect.UIO<number>
      }

      const ServiceWithEffect = Tag<ServiceWithEffect>()

      const program = Stream.serviceWithEffect(ServiceWithEffect, (_) => _.live)
        .provideSomeLayer(Layer.succeed(ServiceWithEffect, {
          live: Effect.succeed(10)
        }))
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(10))
    })

    it("serviceWithStream", async () => {
      interface ServiceWithStream {
        readonly live: Stream<never, never, number>
      }

      const ServiceWithStream = Tag<ServiceWithStream>()

      const program = Stream.serviceWithStream(ServiceWithStream, (_) => _.live)
        .provideSomeLayer(
          Layer.succeed(ServiceWithStream, {
            live: Stream.fromCollection(Chunk.range(0, 10))
          })
        )
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 10))
    })
  })
})
