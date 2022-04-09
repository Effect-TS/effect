import { constTrue } from "@tsplus/stdlib/data/Function";

describe("Stream", () => {
  describe("filter", () => {
    it("simple example", async () => {
      const p = (n: number) => n % 2 === 0;
      const stream = Stream(1, 2, 3, 4, 5, 6);
      const program = Effect.struct({
        actual: stream.filter(p).runCollect(),
        expected: stream.runCollect().map((chunk) => chunk.filter(p))
      });

      const { actual, expected } = await program.unsafeRunPromise();

      assert.isTrue(actual == expected);
    });
  });

  describe("filterEffect", () => {
    it("simple example", async () => {
      const p = (n: number) => Effect.succeed(n % 2 === 0);
      const stream = Stream(1, 2, 3, 4, 5, 6);
      const program = Effect.struct({
        actual: stream.filterEffect(p).runCollect(),
        expected: stream.runCollect().flatMap((chunk) => chunk.filterEffect(p))
      });

      const { actual, expected } = await program.unsafeRunPromise();

      assert.isTrue(actual == expected);
    });

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3, 4)
        .filterEffect((n) => n === 3 ? Effect.fail("boom") : Effect.succeed(constTrue))
        .either()
        .runCollect();

      const result = await program.unsafeRunPromise();

      assert.isTrue(
        result == Chunk(
          Either.right(1),
          Either.right(2),
          Either.left("boom")
        )
      );
    });
  });
});
