describe.concurrent("Layer", () => {
  describe.concurrent("map", () => {
    it("can map a layer to an unrelated type", async () => {
      const ServiceAId = Symbol();

      class ServiceAImpl {
        readonly [ServiceAId] = ServiceAId;
        constructor(readonly name: string, readonly value: number) {}
      }

      const ServiceA = Service<ServiceAImpl>(ServiceAId);

      const ServiceBId = Symbol();

      class ServiceBImpl {
        readonly [ServiceBId] = ServiceBId;
        constructor(readonly name: string) {}
      }

      const ServiceB = Service<ServiceBImpl>(ServiceBId);

      const layer1 = Layer.fromValue(ServiceA)(new ServiceAImpl("name", 1));
      const layer2 = Layer.fromFunction(ServiceB)(
        (_: ServiceAImpl) => new ServiceBImpl(_.name)
      );

      const live = layer1.map(ServiceA.get) >> layer2;

      const program = Effect.service(ServiceB).provideLayer(live);

      const { name } = await program.unsafeRunPromise();

      assert.strictEqual(name, "name");
    });
  });
});
