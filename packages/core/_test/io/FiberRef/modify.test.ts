const initial = "initial";
const update = "update";

describe.concurrent("FiberRef", () => {
  describe.concurrent("modify", () => {
    it("changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.modify(() => Tuple(1, update)))
        .bind("value2", ({ fiberRef }) => fiberRef.get());

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise();

      assert.strictEqual(value1, 1);
      assert.strictEqual(value2, update);
    });
  });

  describe.concurrent("modifySome", () => {
    it("not changes value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("value1", ({ fiberRef }) => fiberRef.modifySome(2, () => Option.none))
        .bind("value2", ({ fiberRef }) => fiberRef.get());

      const { value1, value2 } = await Effect.scoped(program).unsafeRunPromise();

      assert.strictEqual(value1, 2);
      assert.strictEqual(value2, initial);
    });
  });
});
