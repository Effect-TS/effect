describe.concurrent("Layer", () => {
  describe.concurrent("project", () => {
    it("project", async () => {
      interface PersonService {
        readonly name: string;
        readonly age: number;
      }

      interface AgeService extends Pick<PersonService, "age"> {}

      const PersonTag = Tag<PersonService>();
      const AgeTag = Tag<AgeService>();

      const personLayer = Layer.fromValue(PersonTag)({ name: "User", age: 42 });
      const ageLayer = personLayer.project(PersonTag, AgeTag, (_) => ({ age: _.age }));

      const program = Effect.service(AgeTag).provideLayer(ageLayer);

      const { age } = await program.unsafeRunPromise();

      assert.strictEqual(age, 42);
    });
  });
});
