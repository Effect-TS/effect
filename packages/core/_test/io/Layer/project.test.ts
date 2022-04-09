describe.concurrent("Layer", () => {
  describe.concurrent("project", () => {
    it("project", async () => {
      const PersonServiceId = Symbol();
      const AgeServiceId = Symbol();

      interface PersonService {
        readonly name: string;
        readonly age: number;
      }

      interface AgeService extends Pick<PersonService, "age"> {}

      const PersonService = Service<PersonService>(PersonServiceId);
      const AgeService = Service<AgeService>(AgeServiceId);

      const personLayer = Layer.fromValue(PersonService)({ name: "User", age: 42 });
      const ageLayer = personLayer.project(PersonService, (_) => AgeService({ age: _.age }));

      const program = Effect.service(AgeService).provideLayer(ageLayer);

      const { age } = await program.unsafeRunPromise();

      assert.strictEqual(age, 42);
    });
  });
});
