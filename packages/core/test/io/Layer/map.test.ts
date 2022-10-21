describe.concurrent("Layer", () => {
  describe.concurrent("map", () => {
    it("can map a layer to an unrelated type", async () => {
      interface ServiceA {
        readonly name: string
        readonly value: number
      }

      const ServiceATag = Tag<ServiceA>()

      interface ServiceB {
        readonly name: string
      }

      const ServiceBTag = Tag<ServiceB>()

      const StringTag = Tag<string>()

      const layer1 = Layer.fromValue(ServiceATag, { name: "name", value: 1 })
      const layer2 = Layer.fromFunction(StringTag, ServiceBTag, (_) => ({ name: _ }))

      const live = layer1.map((env) => Env(StringTag, env.get(ServiceATag).name)) >> layer2

      const program = Effect.service(ServiceBTag).provideLayer(live)

      const { name } = await program.unsafeRunPromise()

      assert.strictEqual(name, "name")
    })
  })
})
